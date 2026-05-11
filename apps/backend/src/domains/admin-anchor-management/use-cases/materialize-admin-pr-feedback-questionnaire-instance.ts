import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities";
import type { FeedbackQuestionnaireTemplateId } from "../../../entities/feedback-questionnaire";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();
const feedbackRepo = new FeedbackQuestionnaireRepository();

export async function materializeAdminPRFeedbackQuestionnaireInstance(input: {
  prId: PRId;
  feedbackQuestionnaireTemplateId: FeedbackQuestionnaireTemplateId;
}) {
  const existing = await prRepo.findById(input.prId);
  if (!existing) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  const instance = await feedbackRepo.createInstanceFromTemplate(
    input.feedbackQuestionnaireTemplateId,
  );
  if (!instance) {
    throw new HTTPException(404, {
      message: "Feedback questionnaire template not found",
    });
  }

  return await prRepo.updateFeedbackQuestionnaireInstanceId(
    input.prId,
    instance.id,
  );
}
