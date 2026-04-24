import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventStatus,
  AnchorEventTimePoolConfig,
  SystemLocationEntry,
  UserLocationEntry,
} from "../../../entities";
import { normalizeAnchorEventTimePoolConfig } from "../../../entities";
import { HTTPException } from "hono/http-exception";
import {
  assertManualPartnerBoundsValid,
  validateAnchorParticipationPolicyOffsets,
} from "../../pr/services";

const anchorEventRepo = new AnchorEventRepository();

export interface CreateAdminAnchorEventInput {
  title: string;
  type: string;
  description: string | null;
  systemLocationPool: SystemLocationEntry[];
  userLocationPool: UserLocationEntry[];
  timePoolConfig: AnchorEventTimePoolConfig;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  coverImage: string | null;
  betaGroupQrCode: string | null;
  status: AnchorEventStatus;
}

export async function createAdminAnchorEvent(
  input: CreateAdminAnchorEventInput,
): Promise<AnchorEvent> {
  assertManualPartnerBoundsValid(
    input.defaultMinPartners,
    input.defaultMaxPartners,
    0,
  );
  validateAnchorParticipationPolicyOffsets({
    confirmationStartOffsetMinutes:
      input.defaultConfirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.defaultConfirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.defaultJoinLockOffsetMinutes,
  });

  const existing = await anchorEventRepo.findOneByType(input.type);
  if (existing) {
    throw new HTTPException(409, {
      message: `Anchor event type already exists: ${input.type}`,
    });
  }

  return await anchorEventRepo.create({
    title: input.title,
    type: input.type,
    description: input.description,
    systemLocationPool: input.systemLocationPool,
    userLocationPool: input.userLocationPool,
    timePoolConfig: normalizeAnchorEventTimePoolConfig(input.timePoolConfig),
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    defaultConfirmationStartOffsetMinutes:
      input.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes:
      input.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: input.defaultJoinLockOffsetMinutes,
    coverImage: input.coverImage,
    betaGroupQrCode: input.betaGroupQrCode,
    status: input.status,
  });
}
