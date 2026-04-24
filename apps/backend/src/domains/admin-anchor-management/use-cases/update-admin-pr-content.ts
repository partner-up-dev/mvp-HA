import { HTTPException } from "hono/http-exception";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { updatePRContent } from "../../pr";
import {
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
} from "../../../entities/anchor-event";
import { materializePRSupportResources } from "../../pr-booking-support";
import { validateAnchorParticipationPolicyOffsets } from "../../pr/services";
import { countActiveVisiblePRsByEventTimeWindowAndLocationSource } from "../../pr/services";
import type { PRId } from "../../../entities";

const eventContextRepo = new AnchorEventPRContextRepository();
const anchorEventRepo = new AnchorEventRepository();

export interface UpdateAdminPRContentInput {
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

export async function updateAdminPRContent(
  prId: PRId,
  input: UpdateAdminPRContentInput,
) {
  const eventContextRecord = await eventContextRepo.findRecordByPrId(prId);
  if (!eventContextRecord) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  const event = await anchorEventRepo.findById(
    eventContextRecord.anchor.anchorEventId,
  );
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
        message: "PR location must belong to the selected event location pool",
      });
    }

    if (matchedUserLocation) {
      const effectiveActiveCount =
        await countActiveVisiblePRsByEventTimeWindowAndLocationSource(
          {
            anchorEventId: event.id,
            timeWindow: eventContextRecord.anchor.timeWindow,
            location: input.location,
            locationSource: "USER",
            excludePrId: eventContextRecord.root.id,
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
      time: eventContextRecord.anchor.timeWindow,
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

  await eventContextRepo.updateParticipationPolicy(prId, {
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });

  await materializePRSupportResources({
    prId,
    anchorEventId: eventContextRecord.anchor.anchorEventId,
    location: input.location,
    timeWindow: eventContextRecord.anchor.timeWindow,
  });

  return updated;
}
