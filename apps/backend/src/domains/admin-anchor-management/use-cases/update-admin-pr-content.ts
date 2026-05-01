import { HTTPException } from "hono/http-exception";
import { updatePRContent } from "../../pr";
import { type TimeWindowEntry } from "../../../entities/anchor-event";
import { validateAnchorParticipationPolicyOffsets } from "../../pr/services";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId } from "../../../entities";
import type { MeetingPointConfig } from "../../../entities";

const prRepo = new PartnerRequestRepository();

export interface UpdateAdminPRContentInput {
  title: string | null;
  type: string;
  timeWindow: TimeWindowEntry;
  location: string | null;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  meetingPoint?: MeetingPointConfig | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
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

export async function updateAdminPRContent(
  prId: PRId,
  input: UpdateAdminPRContentInput,
) {
  const existing = await prRepo.findById(prId);
  if (!existing) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  assertTimeWindowValid(input.timeWindow);
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
      time: input.timeWindow,
      location: input.location,
      minPartners: input.minPartners,
      maxPartners: input.maxPartners,
      partners: [],
      budget: null,
      preferences: input.preferences,
      notes: input.notes,
      meetingPoint: input.meetingPoint ?? null,
    },
    null,
    {
      bypassEditableStatusGuard: true,
      preserveStatus: true,
    },
  );

  await prRepo.updatePartnerRules(prId, {
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });

  return updated;
}
