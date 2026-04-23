import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type { AnchorPRContext } from "../../../repositories/AnchorPRRepository";
import { initializeSlotsForPR } from "../../pr/services";
import { materializePRSupportResources } from "../../pr-booking-support";
import {
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
  type AnchorEventId,
  type TimeWindowEntry,
} from "../../../entities/anchor-event";
import { validateAnchorParticipationPolicyOffsets } from "../../pr/services";
import { countActiveVisibleAnchorPRsByEventTimeWindowAndLocationSource } from "../../pr/services";
import { assertManualPartnerBoundsValid } from "../../pr/services";
import type { PartnerRequest } from "../../../entities";
import { eventOwnsTimeWindow } from "../../anchor-event/services/time-window-pool";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();

export interface CreateAdminAnchorPRInput {
  title: string | null;
  type: string | null;
  location: string;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
}

export interface CreateAdminAnchorPROutput {
  root: PartnerRequest;
  anchor: AnchorPRContext;
}

export async function createAdminAnchorPR(
  anchorEventId: AnchorEventId,
  timeWindow: TimeWindowEntry,
  input: CreateAdminAnchorPRInput,
): Promise<CreateAdminAnchorPROutput> {
  const event = await anchorEventRepo.findById(anchorEventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }
  if (!eventOwnsTimeWindow(event, timeWindow)) {
    throw new HTTPException(400, {
      message: "Anchor event time window is not available",
    });
  }

  const systemLocationPool = normalizeSystemLocationPool(event.systemLocationPool);
  const userLocationPool = normalizeUserLocationPool(event.userLocationPool);
  const matchedUserLocation = userLocationPool.find(
    (entry) => entry.id === input.location,
  );
  const inSystemPool = systemLocationPool.includes(input.location);
  if (!matchedUserLocation && !inSystemPool) {
    throw new HTTPException(400, {
      message: "Anchor PR location must belong to the anchor event location pool",
    });
  }
  const locationSource = matchedUserLocation ? "USER" : "SYSTEM";
  if (matchedUserLocation) {
    const activeCount =
      await countActiveVisibleAnchorPRsByEventTimeWindowAndLocationSource(
        {
          anchorEventId: event.id,
          timeWindow,
          location: input.location,
          locationSource: "USER",
        },
      );
    if (activeCount >= matchedUserLocation.perBatchCap) {
      throw new HTTPException(409, {
        message: "Selected location has reached per-batch cap",
      });
    }
  }
  validateAnchorParticipationPolicyOffsets({
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });
  assertManualPartnerBoundsValid(input.minPartners, input.maxPartners, 0);

  const createdRoot = await prRepo.create({
    title: input.title,
    type: input.type?.trim() || event.type,
    time: timeWindow,
    location: input.location,
    status: "OPEN",
    visibilityStatus: "VISIBLE",
    minPartners: input.minPartners,
    maxPartners: input.maxPartners,
    preferences: input.preferences,
    notes: input.notes,
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });

  await initializeSlotsForPR(
    createdRoot.id,
    null,
  );

  await materializePRSupportResources({
    prId: createdRoot.id,
    anchorEventId: event.id,
    location: createdRoot.location,
    timeWindow: createdRoot.time,
  });

  return {
    root: createdRoot,
    anchor: {
      prId: createdRoot.id,
      anchorEventId: event.id,
      timeWindow,
      locationSource,
      visibilityStatus: "VISIBLE",
      confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
      confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
      joinLockOffsetMinutes: input.joinLockOffsetMinutes,
      bookingTriggeredAt: null,
      autoHideAt: null,
    },
  };
}
