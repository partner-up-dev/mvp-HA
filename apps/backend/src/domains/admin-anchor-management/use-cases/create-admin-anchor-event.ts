import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventStatus,
  AnchorEventTimePoolConfig,
  LocationEntry,
  MeetingPointConfig,
  MeetingPointConfigMap,
} from "../../../entities";
import {
  normalizeAnchorEventTimePoolConfig,
  normalizeMeetingPointConfig,
  normalizeMeetingPointConfigMap,
} from "../../../entities";
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
  locationPool: LocationEntry[];
  timePoolConfig: AnchorEventTimePoolConfig;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  meetingPoint?: MeetingPointConfig | null;
  locationMeetingPoints?: MeetingPointConfigMap;
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
    locationPool: input.locationPool,
    timePoolConfig: normalizeAnchorEventTimePoolConfig(input.timePoolConfig),
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    defaultConfirmationStartOffsetMinutes:
      input.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes:
      input.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: input.defaultJoinLockOffsetMinutes,
    meetingPoint: normalizeMeetingPointConfig(input.meetingPoint),
    locationMeetingPoints: normalizeMeetingPointConfigMap(
      input.locationMeetingPoints,
    ),
    coverImage: input.coverImage,
    betaGroupQrCode: input.betaGroupQrCode,
    status: input.status,
  });
}
