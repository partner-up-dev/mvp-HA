import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventId,
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
import {
  assertManualPartnerBoundsValid,
  captureEffectiveMeetingPointsForRequests,
  listRequestsAffectedByAnchorEventMeetingPoint,
  scheduleMeetingPointNotificationsForChangedRequests,
  validateAnchorParticipationPolicyOffsets,
} from "../../pr/services";

const anchorEventRepo = new AnchorEventRepository();

export interface UpdateAdminAnchorEventInput {
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

export async function updateAdminAnchorEvent(
  eventId: AnchorEventId,
  input: UpdateAdminAnchorEventInput,
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

  const current = await anchorEventRepo.findById(eventId);
  if (!current) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const existingByType = await anchorEventRepo.findOneByType(input.type);
  if (existingByType && existingByType.id !== eventId) {
    throw new HTTPException(409, {
      message: `Anchor event type already exists: ${input.type}`,
    });
  }

  const affectedRequests =
    await listRequestsAffectedByAnchorEventMeetingPoint(
      current.type,
      input.type,
    );
  const previousMeetingPoints =
    await captureEffectiveMeetingPointsForRequests(affectedRequests);
  const updatedAt = new Date();

  const updated = await anchorEventRepo.update(eventId, {
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

  if (!updated) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const latestAffectedRequests = await listRequestsAffectedByAnchorEventMeetingPoint(
    current.type,
    input.type,
  );
  await scheduleMeetingPointNotificationsForChangedRequests({
    previous: previousMeetingPoints,
    requests: latestAffectedRequests,
    updatedAt,
  });

  return updated;
}
