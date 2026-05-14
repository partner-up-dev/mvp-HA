import { throwHttpProblem } from "../../../lib/problem-details";
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
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }

  const instance = await feedbackRepo.createInstanceFromTemplate(
    input.feedbackQuestionnaireTemplateId,
  );
  if (!instance) {
    return throwHttpProblem({ status: 404, detail: "Feedback questionnaire template not found" });
  }

  return await prRepo.updateFeedbackQuestionnaireInstanceId(
    input.prId,
    instance.id,
  );
}
