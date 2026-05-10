import { and, eq } from "drizzle-orm";
import { getTestDb } from "../../../_infra/probes/sql-probe";
import {
  anchorEvents,
  feedbackQuestionnaireInstances,
  feedbackQuestionnaireResponses,
  partnerRequests,
  type AnchorEvent,
  type AnchorEventId,
  type PartnerRequest,
  type PRId,
} from "../../../../src/entities";
import type {
  FeedbackQuestionnaireInstance,
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireResponse,
} from "../../../../src/entities/feedback-questionnaire";
import type { UserId } from "../../../../src/entities/user";

export async function probePartnerRequest(
  prId: PRId,
): Promise<PartnerRequest> {
  const rows = await getTestDb()
    .select()
    .from(partnerRequests)
    .where(eq(partnerRequests.id, prId));
  const pr = rows[0] ?? null;
  if (!pr) {
    throw new Error(`PartnerRequest ${prId} not found`);
  }
  return pr;
}

export async function probeAnchorEvent(
  eventId: AnchorEventId,
): Promise<AnchorEvent> {
  const rows = await getTestDb()
    .select()
    .from(anchorEvents)
    .where(eq(anchorEvents.id, eventId));
  const event = rows[0] ?? null;
  if (!event) {
    throw new Error(`AnchorEvent ${eventId} not found`);
  }
  return event;
}

export async function probeFeedbackQuestionnaireInstance(
  instanceId: FeedbackQuestionnaireInstanceId,
): Promise<FeedbackQuestionnaireInstance> {
  const rows = await getTestDb()
    .select()
    .from(feedbackQuestionnaireInstances)
    .where(eq(feedbackQuestionnaireInstances.id, instanceId));
  const instance = rows[0] ?? null;
  if (!instance) {
    throw new Error(`FeedbackQuestionnaireInstance ${instanceId} not found`);
  }
  return instance;
}

export async function probeFeedbackResponsesByInstanceAndUser(input: {
  instanceId: FeedbackQuestionnaireInstanceId;
  respondentUserId: UserId;
}): Promise<FeedbackQuestionnaireResponse[]> {
  return await getTestDb()
    .select()
    .from(feedbackQuestionnaireResponses)
    .where(
      and(
        eq(feedbackQuestionnaireResponses.instanceId, input.instanceId),
        eq(
          feedbackQuestionnaireResponses.respondentUserId,
          input.respondentUserId,
        ),
      ),
    );
}
