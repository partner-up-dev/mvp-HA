import { and, count, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../../lib/db";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { resolveUserByOpenId } from "../../user";
import { partnerRequests } from "../../../entities/partner-request";
import { partners } from "../../../entities/partner";
import { assertNoUserTimeWindowConflict } from "../../pr/services";
import { materializePRSupportResources } from "../../pr-booking-support";
import { normalizeUserLocationPool } from "../../../entities/anchor-event";
import { resolveAnchorPartnerBoundsFromEvent } from "../services/anchor-partner-bounds";
import type { AnchorEvent, AnchorEventId } from "../../../entities/anchor-event";
import type { AnchorEventBatchId } from "../../../entities/anchor-event-batch";
import type { AnchorEventBatch } from "../../../entities/anchor-event-batch";
import type { UserLocationEntry } from "../../../entities/anchor-event";
import {
  countActiveVisibleAnchorPRsByBatchAndLocationSource,
  readVisibleAnchorPRRecordsByBatchIdAndLocation,
} from "../../pr/services";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

const ANCHOR_USER_CREATE_LOCK_NAMESPACE = 31_017;

export class AnchorEventNotFoundError extends Error {
  constructor(readonly eventId: AnchorEventId) {
    super("Anchor event not found");
  }
}

export class AnchorEventBatchNotFoundError extends Error {
  constructor(readonly batchId: AnchorEventBatchId) {
    super("Anchor event batch not found");
  }
}

export class UserCreationLocationUnavailableError extends Error {
  constructor(readonly locationId: string) {
    super("Selected location is not available for user creation");
  }
}

export class LocationCapReachedError extends Error {
  constructor(readonly locationId: string) {
    super("Location cap reached");
  }
}

type UserAnchorPRCreationContext = {
  event: AnchorEvent;
  batch: AnchorEventBatch;
  userLocation: UserLocationEntry;
};

type CreateUserAnchorPRInput = {
  eventId: AnchorEventId;
  batchId: AnchorEventBatchId;
  locationId: string;
  openId: string;
};

const resolveUserAnchorPRCreationContext = async ({
  eventId,
  batchId,
  locationId,
}: {
  eventId: AnchorEventId;
  batchId: AnchorEventBatchId;
  locationId: string;
}): Promise<UserAnchorPRCreationContext> => {
  const [event, batch] = await Promise.all([
    anchorEventRepo.findById(eventId),
    batchRepo.findById(batchId),
  ]);

  if (!event) {
    throw new AnchorEventNotFoundError(eventId);
  }
  if (!batch || batch.anchorEventId !== event.id) {
    throw new AnchorEventBatchNotFoundError(batchId);
  }

  const userLocationPool = normalizeUserLocationPool(event.userLocationPool);
  const userLocation = userLocationPool.find((entry) => entry.id === locationId);
  if (!userLocation) {
    throw new UserCreationLocationUnavailableError(locationId);
  }

  return {
    event,
    batch,
    userLocation,
  };
};

export const checkUserAnchorPRAvailability = async ({
  eventId,
  batchId,
  locationId,
}: {
  eventId: AnchorEventId;
  batchId: AnchorEventBatchId;
  locationId: string;
}): Promise<UserAnchorPRCreationContext> => {
  const context = await resolveUserAnchorPRCreationContext({
    eventId,
    batchId,
    locationId,
  });

  const activeCount =
    await countActiveVisibleAnchorPRsByBatchAndLocationSource(
      {
        batchId: context.batch.id,
        location: locationId,
        locationSource: "USER",
      },
    );
  if (activeCount >= context.userLocation.perBatchCap) {
    throw new LocationCapReachedError(locationId);
  }

  return context;
};

export const createUserAnchorPR = async ({
  eventId,
  batchId,
  locationId,
  openId,
}: CreateUserAnchorPRInput): Promise<{ id: number; canonicalPath: string }> => {
  const [context, user] = await Promise.all([
    resolveUserAnchorPRCreationContext({
      eventId,
      batchId,
      locationId,
    }),
    resolveUserByOpenId(openId),
  ]);
  const { event, batch, userLocation } = context;

  await assertNoUserTimeWindowConflict({
    userId: user.id,
    targetTimeWindow: batch.timeWindow,
  });
  await readVisibleAnchorPRRecordsByBatchIdAndLocation(
    batch.id,
    locationId,
  );

  const bounds = resolveAnchorPartnerBoundsFromEvent({
    defaults: {
      defaultMinPartners: event.defaultMinPartners ?? null,
      defaultMaxPartners: event.defaultMaxPartners ?? null,
    },
  });

  const createdRoot = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${ANCHOR_USER_CREATE_LOCK_NAMESPACE}, ${batch.id})`,
    );

    const quotaRows = await tx
      .select({ value: count() })
      .from(partnerRequests)
      .where(
        and(
          eq(partnerRequests.type, event.type),
          eq(partnerRequests.time, batch.timeWindow),
          eq(partnerRequests.visibilityStatus, "VISIBLE"),
          eq(partnerRequests.location, locationId),
          notInArray(partnerRequests.status, ["CLOSED", "EXPIRED"]),
        ),
      );

    const activeCount = quotaRows[0]?.value ?? 0;
    if (activeCount >= userLocation.perBatchCap) {
      throw new LocationCapReachedError(locationId);
    }

    const insertedRoots = await tx
      .insert(partnerRequests)
      .values({
        title: null,
        type: event.type,
        time: batch.timeWindow,
        location: locationId,
        status: "OPEN",
        visibilityStatus: "VISIBLE",
        confirmationStartOffsetMinutes: 120,
        confirmationEndOffsetMinutes: 30,
        joinLockOffsetMinutes: 30,
        minPartners: bounds.minPartners,
        maxPartners: bounds.maxPartners,
        preferences: [],
        notes: null,
        createdBy: user.id,
      })
      .returning();
    const root = insertedRoots[0];

    await tx.insert(partners).values({
      prId: root.id,
      userId: user.id,
      status: "JOINED",
      releasedAt: null,
      confirmedAt: null,
      attendedAt: null,
      checkInAt: null,
      didAttend: null,
      wouldJoinAgain: null,
      paymentStatus: "NONE",
      reimbursementRequested: false,
      reimbursementStatus: "NONE",
      reimbursementAmount: null,
      reimbursementRequestedAt: null,
      reimbursementReviewedAt: null,
      reimbursementPaidAt: null,
    });

    return root;
  });

  await materializePRSupportResources({
    prId: createdRoot.id,
    anchorEventId: event.id,
    batchId: batch.id,
    location: createdRoot.location,
    timeWindow: createdRoot.time,
  });

  return {
    id: createdRoot.id,
    canonicalPath: `/pr/${createdRoot.id}`,
  };
};
