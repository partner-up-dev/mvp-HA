import { HTTPException } from "hono/http-exception";
import { and, count, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../../lib/db";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { resolveUserByOpenId } from "../../pr-core/services/user-resolver.service";
import { partnerRequests } from "../../../entities/partner-request";
import { anchorPartnerRequests } from "../../../entities/anchor-partner-request";
import { partners } from "../../../entities/partner";
import { resolveDesiredSlotCount } from "../../pr-core/services/slot-management.service";
import { materializePRSupportResources } from "../../pr-booking-support";
import { normalizeUserLocationPool } from "../../../entities/anchor-event";
import type { AnchorEventId } from "../../../entities/anchor-event";
import type { AnchorEventBatchId } from "../../../entities/anchor-event-batch";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

const ANCHOR_USER_CREATE_LOCK_NAMESPACE = 31_017;

export class LocationCapReachedError extends Error {
  constructor(readonly locationId: string) {
    super("Location cap reached");
  }
}

type CreateUserAnchorPRInput = {
  eventId: AnchorEventId;
  batchId: AnchorEventBatchId;
  locationId: string;
  openId: string;
};

export const createUserAnchorPR = async ({
  eventId,
  batchId,
  locationId,
  openId,
}: CreateUserAnchorPRInput): Promise<{ id: number; canonicalPath: string }> => {
  const [event, batch, user] = await Promise.all([
    anchorEventRepo.findById(eventId),
    batchRepo.findById(batchId),
    resolveUserByOpenId(openId),
  ]);

  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }
  if (!batch || batch.anchorEventId !== event.id) {
    throw new HTTPException(404, { message: "Anchor event batch not found" });
  }

  const userLocationPool = normalizeUserLocationPool(event.userLocationPool);
  const matchedLocation = userLocationPool.find((entry) => entry.id === locationId);
  if (!matchedLocation) {
    throw new HTTPException(400, {
      message: "Selected location is not available for user creation",
    });
  }

  const createdRoot = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${ANCHOR_USER_CREATE_LOCK_NAMESPACE}, ${batch.id})`,
    );

    const quotaRows = await tx
      .select({ value: count() })
      .from(anchorPartnerRequests)
      .innerJoin(
        partnerRequests,
        eq(partnerRequests.id, anchorPartnerRequests.prId),
      )
      .where(
        and(
          eq(anchorPartnerRequests.batchId, batch.id),
          eq(anchorPartnerRequests.locationSource, "USER"),
          eq(anchorPartnerRequests.visibilityStatus, "VISIBLE"),
          eq(partnerRequests.location, locationId),
          notInArray(partnerRequests.status, ["CLOSED", "EXPIRED"]),
        ),
      );

    const activeCount = quotaRows[0]?.value ?? 0;
    if (activeCount >= matchedLocation.perBatchCap) {
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
        minPartners: null,
        maxPartners: null,
        preferences: [],
        notes: null,
        createdBy: user.id,
        prKind: "ANCHOR",
      })
      .returning();
    const root = insertedRoots[0];

    await tx.insert(anchorPartnerRequests).values({
      prId: root.id,
      anchorEventId: event.id,
      batchId: batch.id,
      locationSource: "USER",
      visibilityStatus: "VISIBLE",
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
      bookingTriggeredAt: null,
      autoHideAt: null,
    });

    const slotCount = resolveDesiredSlotCount(root.minPartners, root.maxPartners);
    const now = new Date();
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
    if (slotCount > 1) {
      await tx.insert(partners).values(
        Array.from({ length: slotCount - 1 }, () => ({
          prId: root.id,
          userId: null,
          status: "RELEASED" as const,
          releasedAt: now,
        })),
      );
    }

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
    canonicalPath: `/apr/${createdRoot.id}`,
  };
};
