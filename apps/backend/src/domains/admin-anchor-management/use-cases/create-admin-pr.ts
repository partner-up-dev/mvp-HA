import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { initializeSlotsForPR } from "../../pr/services";
import { type TimeWindowEntry } from "../../../entities/anchor-event";
import {
  assertManualPartnerBoundsValid,
  validateAnchorParticipationPolicyOffsets,
} from "../../pr/services";
import type { PartnerRequest } from "../../../entities";

const prRepo = new PartnerRequestRepository();

export interface CreateAdminPRInput {
  title: string | null;
  type: string;
  location: string;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
}

export interface CreateAdminPROutput {
  root: PartnerRequest;
}

const assertTimeWindowValid = (timeWindow: TimeWindowEntry) => {
  if (timeWindow[0] === null || timeWindow[1] === null) {
    return;
  }

  const startAt = new Date(timeWindow[0]);
  const endAt = new Date(timeWindow[1]);
  if (
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    startAt.getTime() > endAt.getTime()
  ) {
    throw new HTTPException(400, {
      message: "PR time window is invalid",
    });
  }
};

export async function createAdminPR(
  timeWindow: TimeWindowEntry,
  input: CreateAdminPRInput,
): Promise<CreateAdminPROutput> {
  assertTimeWindowValid(timeWindow);
  validateAnchorParticipationPolicyOffsets({
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });
  assertManualPartnerBoundsValid(input.minPartners, input.maxPartners, 0);

  const createdRoot = await prRepo.create({
    title: input.title,
    type: input.type.trim(),
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

  await initializeSlotsForPR(createdRoot.id, null);

  return {
    root: createdRoot,
  };
}
