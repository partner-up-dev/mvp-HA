import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventSupportResourceRepository } from "../../../repositories/AnchorEventSupportResourceRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { AnchorEventId, PRId, PRJoinGateConfig } from "../../../entities";
import type { TimeWindow } from "./time-window.service";
import { materializePRSupportResources } from "../../pr-booking-support";
import { materializeFeedbackQuestionnaireInstance } from "../../feedback-questionnaire";
import { buildMaterializedPRJoinGateConfig } from "./join-gates.service";

const anchorEventRepo = new AnchorEventRepository();
const eventSupportRepo = new AnchorEventSupportResourceRepository();
const prRepo = new PartnerRequestRepository();

export async function materializeEventDefaultsForPR(input: {
  prId: PRId;
  anchorEventId?: AnchorEventId;
  type: string;
  location: string | null;
  timeWindow: TimeWindow;
  prJoinGateConfig?: PRJoinGateConfig;
}): Promise<void> {
  const event = input.anchorEventId
    ? await anchorEventRepo.findById(input.anchorEventId)
    : await anchorEventRepo.findOneByType(input.type.trim());
  if (!event) {
    if (input.prJoinGateConfig) {
      await prRepo.updateJoinGateConfig(input.prId, input.prJoinGateConfig);
    }
    return;
  }

  const eventResources = await eventSupportRepo.findByAnchorEventId(event.id);
  const joinGateConfig = buildMaterializedPRJoinGateConfig({
    event,
    resources: eventResources,
    location: input.location,
    timeWindow: input.timeWindow,
    prGates: input.prJoinGateConfig,
  });
  await prRepo.updateJoinGateConfig(input.prId, joinGateConfig);

  await materializePRSupportResources({
    prId: input.prId,
    anchorEventId: event.id,
    location: input.location,
    timeWindow: input.timeWindow,
  });

  const feedbackQuestionnaireInstanceId =
    await materializeFeedbackQuestionnaireInstance(
      event.feedbackQuestionnaireTemplateId ?? null,
    );
  await prRepo.updateFeedbackQuestionnaireInstanceId(
    input.prId,
    feedbackQuestionnaireInstanceId,
  );
}
