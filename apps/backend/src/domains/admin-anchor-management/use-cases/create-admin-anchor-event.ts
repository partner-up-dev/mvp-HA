import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import type {
  AnchorEvent,
  AnchorEventStatus,
  AnchorEventTimePoolConfig,
  LocationEntry,
  MeetingPointConfig,
  MeetingPointConfigMap,
  PRJoinGateConfig,
  FeedbackQuestionnaireTemplateId,
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
const feedbackRepo = new FeedbackQuestionnaireRepository();

export interface CreateAdminAnchorEventInput {
  title: string;
  type: string;
  description: string | null;
  locationPool: LocationEntry[];
  timePoolConfig: AnchorEventTimePoolConfig;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultPrNotes: string | null;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  meetingPoint?: MeetingPointConfig | null;
  joinGateConfig?: PRJoinGateConfig;
  feedbackQuestionnaireTemplateId?: FeedbackQuestionnaireTemplateId | null;
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
  if (input.feedbackQuestionnaireTemplateId !== null && input.feedbackQuestionnaireTemplateId !== undefined) {
    const template = await feedbackRepo.findTemplateById(
      input.feedbackQuestionnaireTemplateId,
    );
    if (!template) {
      throw new HTTPException(404, {
        message: "Feedback questionnaire template not found",
      });
    }
  }

  return await anchorEventRepo.create({
    title: input.title,
    type: input.type,
    description: input.description,
    locationPool: input.locationPool,
    timePoolConfig: normalizeAnchorEventTimePoolConfig(input.timePoolConfig),
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    defaultPrNotes: input.defaultPrNotes,
    defaultConfirmationStartOffsetMinutes:
      input.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes:
      input.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: input.defaultJoinLockOffsetMinutes,
    meetingPoint: normalizeMeetingPointConfig(input.meetingPoint),
    joinGateConfig: input.joinGateConfig ?? [],
    feedbackQuestionnaireTemplateId: input.feedbackQuestionnaireTemplateId ?? null,
    locationMeetingPoints: normalizeMeetingPointConfigMap(
      input.locationMeetingPoints,
    ),
    coverImage: input.coverImage,
    betaGroupQrCode: input.betaGroupQrCode,
    status: input.status,
  });
}
