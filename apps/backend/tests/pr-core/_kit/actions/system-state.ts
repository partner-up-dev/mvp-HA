import { eq } from "drizzle-orm";
import {
  type MeetingPointConfig,
  partnerRequests,
  type PRStatus,
  users,
  type PRJoinGateConfig,
  type PRId,
} from "../../../../src/entities";
import type { FeedbackQuestionnaireInstanceId } from "../../../../src/entities/feedback-questionnaire";
import { getTestDb } from "../../../_infra/probes/sql-probe";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export async function configureJoinGate(input: {
  pr: ScenarioPartnerRequest;
  config: PRJoinGateConfig;
}): Promise<void> {
  await getTestDb()
    .update(partnerRequests)
    .set({ joinGateConfig: input.config })
    .where(eq(partnerRequests.id, input.pr.id));
}

export async function configurePRStatus(input: {
  pr: ScenarioPartnerRequest;
  status: PRStatus;
}): Promise<void> {
  await getTestDb()
    .update(partnerRequests)
    .set({ status: input.status })
    .where(eq(partnerRequests.id, input.pr.id));
}

export async function configurePRMeetingPoint(input: {
  pr: ScenarioPartnerRequest;
  meetingPoint: MeetingPointConfig | null;
}): Promise<void> {
  await getTestDb()
    .update(partnerRequests)
    .set({ meetingPoint: input.meetingPoint })
    .where(eq(partnerRequests.id, input.pr.id));
}

export async function configureOpenConfirmationWindow(
  pr: ScenarioPartnerRequest,
): Promise<void> {
  const startsAt = new Date(Date.now() + 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  await getTestDb()
    .update(partnerRequests)
    .set({
      time: [startsAt.toISOString(), endsAt.toISOString()],
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
    })
    .where(eq(partnerRequests.id, pr.id));
}

export async function configureStartedEvent(
  pr: ScenarioPartnerRequest,
): Promise<void> {
  const startAt = new Date(Date.now() - 30 * 60 * 1000);
  const endAt = new Date(Date.now() + 90 * 60 * 1000);

  await getTestDb()
    .update(partnerRequests)
    .set({
      time: [startAt.toISOString(), endAt.toISOString()],
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
    })
    .where(eq(partnerRequests.id, pr.id));
}

export async function configureStartedEventWithFeedback(input: {
  prId: PRId;
  feedbackQuestionnaireInstanceId: FeedbackQuestionnaireInstanceId;
}): Promise<void> {
  const startAt = new Date(Date.now() - 30 * 60 * 1000);
  const endAt = new Date(Date.now() + 90 * 60 * 1000);

  await getTestDb()
    .update(partnerRequests)
    .set({
      time: [startAt.toISOString(), endAt.toISOString()],
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
      feedbackQuestionnaireInstanceId: input.feedbackQuestionnaireInstanceId,
    })
    .where(eq(partnerRequests.id, input.prId));
}

export async function bindScenarioWeChatOpenId(input: {
  user: ScenarioUser;
  openId: string;
}): Promise<void> {
  await getTestDb()
    .update(users)
    .set({ openId: input.openId })
    .where(eq(users.id, input.user.user.id));
}
