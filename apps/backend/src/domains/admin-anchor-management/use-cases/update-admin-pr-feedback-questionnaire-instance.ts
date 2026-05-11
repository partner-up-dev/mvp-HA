import { HTTPException } from "hono/http-exception";
import type {
  FeedbackQuestionnaireInstanceId,
} from "../../../entities/feedback-questionnaire";
import type { PRId } from "../../../entities";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();
const feedbackRepo = new FeedbackQuestionnaireRepository();

export async function updateAdminPRFeedbackQuestionnaireInstance(
  prId: PRId,
  feedbackQuestionnaireInstanceId: FeedbackQuestionnaireInstanceId | null,
) {
  const existing = await prRepo.findById(prId);
  if (!existing) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  if (feedbackQuestionnaireInstanceId !== null) {
    const instance = await feedbackRepo.findInstanceById(
      feedbackQuestionnaireInstanceId,
    );
    if (!instance) {
      throw new HTTPException(404, {
        message: "Feedback questionnaire instance not found",
      });
    }
  }

  return await prRepo.updateFeedbackQuestionnaireInstanceId(
    prId,
    feedbackQuestionnaireInstanceId,
  );
}
