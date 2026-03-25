import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  AnchorEventStatus,
  SystemLocationEntry,
  UserLocationEntry,
} from "../../../entities";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  validateAnchorParticipationPolicyOffsets,
} from "../../pr-core/services/anchor-participation-policy.service";

const anchorEventRepo = new AnchorEventRepository();

export interface UpdateAdminAnchorEventInput {
  title: string;
  type: string;
  description: string | null;
  systemLocationPool: SystemLocationEntry[];
  userLocationPool: UserLocationEntry[];
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  coverImage: string | null;
  status: AnchorEventStatus;
}

export async function updateAdminAnchorEvent(
  eventId: AnchorEventId,
  input: UpdateAdminAnchorEventInput,
): Promise<AnchorEvent> {
  validateAnchorParticipationPolicyOffsets({
    confirmationStartOffsetMinutes:
      input.defaultConfirmationStartOffsetMinutes ??
      DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    confirmationEndOffsetMinutes:
      input.defaultConfirmationEndOffsetMinutes ??
      DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    joinLockOffsetMinutes:
      input.defaultJoinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  });

  const updated = await anchorEventRepo.update(eventId, {
    title: input.title,
    type: input.type,
    description: input.description,
    systemLocationPool: input.systemLocationPool,
    userLocationPool: input.userLocationPool,
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    defaultConfirmationStartOffsetMinutes:
      input.defaultConfirmationStartOffsetMinutes ??
      DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    defaultConfirmationEndOffsetMinutes:
      input.defaultConfirmationEndOffsetMinutes ??
      DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    defaultJoinLockOffsetMinutes:
      input.defaultJoinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    coverImage: input.coverImage,
    status: input.status,
  });

  if (!updated) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  return updated;
}
