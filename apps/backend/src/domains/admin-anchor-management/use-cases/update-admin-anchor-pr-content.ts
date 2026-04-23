import { HTTPException } from "hono/http-exception";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { updatePRContent } from "../../pr";
import {
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
} from "../../../entities/anchor-event";
import { materializePRSupportResources } from "../../pr-booking-support";
import { validateAnchorParticipationPolicyOffsets } from "../../pr/services";
import { countActiveVisibleAnchorPRsByEventTimeWindowAndLocationSource } from "../../pr/services";
import type { PRId } from "../../../entities";

const anchorPRRepo = new AnchorPRRepository();
const anchorEventRepo = new AnchorEventRepository();

export interface UpdateAdminAnchorPRContentInput {
  title: string | null;
  type: string;
  location: string | null;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
}

export async function updateAdminAnchorPRContent(
  prId: PRId,
  input: UpdateAdminAnchorPRContentInput,
) {
  const anchorRecord = await anchorPRRepo.findRecordByPrId(prId);
  if (!anchorRecord) {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  const event = await anchorEventRepo.findById(anchorRecord.anchor.anchorEventId);
  if (!event) {
    throw new HTTPException(500, { message: "Anchor event missing" });
  }

  if (input.location) {
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

    if (matchedUserLocation) {
      const effectiveActiveCount =
        await countActiveVisibleAnchorPRsByEventTimeWindowAndLocationSource(
          {
            anchorEventId: event.id,
            timeWindow: anchorRecord.anchor.timeWindow,
            location: input.location,
            locationSource: "USER",
            excludePrId: anchorRecord.root.id,
          },
        );
      if (effectiveActiveCount >= matchedUserLocation.perBatchCap) {
        throw new HTTPException(409, {
          message: "Selected location has reached per-batch cap",
        });
      }
    }
  }
  validateAnchorParticipationPolicyOffsets({
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });

  const updated = await updatePRContent(
    prId,
    {
      title: input.title ?? undefined,
      type: input.type,
      time: anchorRecord.anchor.timeWindow,
      location: input.location,
      minPartners: input.minPartners,
      maxPartners: input.maxPartners,
      partners: [],
      budget: null,
      preferences: input.preferences,
      notes: input.notes,
    },
    null,
  );

  await anchorPRRepo.updateParticipationPolicy(prId, {
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });

  await materializePRSupportResources({
    prId,
    anchorEventId: anchorRecord.anchor.anchorEventId,
    location: input.location,
    timeWindow: anchorRecord.anchor.timeWindow,
  });

  return updated;
}
