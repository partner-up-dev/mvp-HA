import type {
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireTemplateId,
} from "../../../entities/feedback-questionnaire";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";

const feedbackRepo = new FeedbackQuestionnaireRepository();

export async function materializeFeedbackQuestionnaireInstance(
  templateId: FeedbackQuestionnaireTemplateId | null,
): Promise<FeedbackQuestionnaireInstanceId | null> {
  if (templateId === null) {
    return null;
  }

  const instance = await feedbackRepo.createInstanceFromTemplate(templateId);
  return instance?.id ?? null;
}
