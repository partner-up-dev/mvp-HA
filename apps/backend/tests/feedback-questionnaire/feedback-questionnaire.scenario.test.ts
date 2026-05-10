import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import {
  givenAnchorEvent,
  givenAnchorEventVisiblePR,
} from "../anchor-event/_kit/builders/anchor-events";
import { givenAdminUser, givenUser } from "../pr-core/_kit/builders/users";
import {
  buildNeedsImprovementFeedbackAnswers,
  buildRecommendFeedbackAnswers,
  givenFeedbackQuestionnaireInstance,
  givenFeedbackQuestionnaireTemplate,
} from "./_kit/builders/questionnaires";
import { submitFeedbackQuestionnaire } from "./_kit/actions/feedback";
import {
  probeAnchorEvent,
  probeFeedbackQuestionnaireInstance,
  probeFeedbackResponsesByInstanceAndUser,
  probePartnerRequest,
} from "./_kit/probes/questionnaires";
import type { PartnerRequest } from "../../src/entities";

type AdminFeedbackQuestionnaireOverrideResponse = Pick<
  PartnerRequest,
  "id" | "feedbackQuestionnaireInstanceId"
>;

scenario(
  "anchor_event_template_materializes_feedback_instance_on_public_pr_create",
  async (ctx) => {
    const creator = await givenUser("feedback-materialize-creator");
    const template = await givenFeedbackQuestionnaireTemplate({
      label: "materialize",
    });
    const event = await givenAnchorEvent({
      label: "feedback-materialize",
      feedbackQuestionnaireTemplateId: template.id,
    });

    const pr = await givenAnchorEventVisiblePR({
      creator,
      event,
      title: "Scenario feedback materialization PR",
    });

    ctx.record("templateId", template.id);
    ctx.record("eventId", event.id);
    ctx.record("prId", pr.id);

    const createdPR = await probePartnerRequest(pr.id);
    assert.notEqual(createdPR.feedbackQuestionnaireInstanceId, null);

    const instance = await probeFeedbackQuestionnaireInstance(
      createdPR.feedbackQuestionnaireInstanceId,
    );
    assert.equal(instance.templateId, template.id);
    assert.equal(instance.title, template.title);
    assert.deepEqual(instance.definition, template.definition);
  },
);

scenario(
  "feedback_post_persists_response_and_upserts_same_user",
  async (ctx) => {
    const respondent = await givenUser("feedback-respondent");
    const template = await givenFeedbackQuestionnaireTemplate({
      label: "response-upsert",
    });
    const instance = await givenFeedbackQuestionnaireInstance({ template });

    ctx.record("respondentUserId", respondent.user.id);
    ctx.record("instanceId", instance.id);

    const firstAnswers = buildRecommendFeedbackAnswers();
    const firstSubmit = await submitFeedbackQuestionnaire({
      instanceId: instance.id,
      respondent,
      answers: firstAnswers,
    });

    assert.equal(firstSubmit.instanceId, instance.id);

    const firstRows = await probeFeedbackResponsesByInstanceAndUser({
      instanceId: instance.id,
      respondentUserId: respondent.user.id,
    });
    assert.equal(firstRows.length, 1);
    assert.equal(firstRows[0]?.id, firstSubmit.responseId);
    assert.deepEqual(firstRows[0]?.answers, firstAnswers);

    const secondAnswers = buildNeedsImprovementFeedbackAnswers();
    const secondSubmit = await submitFeedbackQuestionnaire({
      instanceId: instance.id,
      respondent,
      answers: secondAnswers,
    });

    assert.equal(secondSubmit.responseId, firstSubmit.responseId);

    const secondRows = await probeFeedbackResponsesByInstanceAndUser({
      instanceId: instance.id,
      respondentUserId: respondent.user.id,
    });
    assert.equal(secondRows.length, 1);
    assert.equal(secondRows[0]?.id, firstSubmit.responseId);
    assert.deepEqual(secondRows[0]?.answers, secondAnswers);
  },
);

scenario(
  "admin_pr_feedback_questionnaire_override_updates_only_pr_instance_pointer",
  async (ctx) => {
    const admin = await givenAdminUser("feedback-pointer-admin");
    const creator = await givenUser("feedback-pointer-creator");
    const eventTemplate = await givenFeedbackQuestionnaireTemplate({
      label: "pointer-event-default",
    });
    const overrideTemplate = await givenFeedbackQuestionnaireTemplate({
      label: "pointer-override",
    });
    const overrideInstance = await givenFeedbackQuestionnaireInstance({
      template: overrideTemplate,
    });
    const event = await givenAnchorEvent({
      label: "feedback-pointer",
      feedbackQuestionnaireTemplateId: eventTemplate.id,
    });
    const pr = await givenAnchorEventVisiblePR({
      creator,
      event,
      title: "Scenario feedback pointer PR",
    });

    const beforePR = await probePartnerRequest(pr.id);
    assert.notEqual(beforePR.feedbackQuestionnaireInstanceId, null);

    ctx.record("prId", pr.id);
    ctx.record("eventId", event.id);
    ctx.record(
      "beforeInstanceId",
      beforePR.feedbackQuestionnaireInstanceId ?? null,
    );
    ctx.record("overrideInstanceId", overrideInstance.id);

    const response = await requestJson(
      `/api/admin/prs/${pr.id}/feedback-questionnaire-instance`,
      {
        method: "PATCH",
        token: admin.token,
        body: {
          feedbackQuestionnaireInstanceId: overrideInstance.id,
        },
      },
    );
    const body =
      await expectJsonResponse<AdminFeedbackQuestionnaireOverrideResponse>(
        response,
        200,
      );

    assert.equal(body.id, pr.id);
    assert.equal(body.feedbackQuestionnaireInstanceId, overrideInstance.id);

    const afterPR = await probePartnerRequest(pr.id);
    const afterEvent = await probeAnchorEvent(event.id);

    const {
      feedbackQuestionnaireInstanceId: beforeFeedbackQuestionnaireInstanceId,
      ...beforePRRest
    } = beforePR;
    const {
      feedbackQuestionnaireInstanceId: afterFeedbackQuestionnaireInstanceId,
      ...afterPRRest
    } = afterPR;

    assert.notEqual(beforeFeedbackQuestionnaireInstanceId, overrideInstance.id);
    assert.equal(afterFeedbackQuestionnaireInstanceId, overrideInstance.id);
    assert.deepEqual(afterPRRest, beforePRRest);
    assert.equal(afterEvent.feedbackQuestionnaireTemplateId, eventTemplate.id);
  },
);
