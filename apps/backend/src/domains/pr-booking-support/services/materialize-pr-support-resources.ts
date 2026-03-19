import type { PartnerRequestFields, PRId } from "../../../entities";
import { AnchorEventBatchSupportOverrideRepository } from "../../../repositories/AnchorEventBatchSupportOverrideRepository";
import { AnchorEventSupportResourceRepository } from "../../../repositories/AnchorEventSupportResourceRepository";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import { type AnchorEventId } from "../../../entities/anchor-event";
import { type AnchorEventBatchId } from "../../../entities/anchor-event-batch";
import { resolveSupportResourceTemplates } from "./resolve-support-resource-templates";

const eventSupportRepo = new AnchorEventSupportResourceRepository();
const batchSupportOverrideRepo = new AnchorEventBatchSupportOverrideRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();

export interface MaterializePRSupportResourcesInput {
  prId: PRId;
  anchorEventId: AnchorEventId;
  batchId: AnchorEventBatchId;
  location: string | null;
  timeWindow: PartnerRequestFields["time"];
}

export async function materializePRSupportResources({
  prId,
  anchorEventId,
  batchId,
  location,
  timeWindow,
}: MaterializePRSupportResourcesInput) {
  const [eventResources, batchOverrides] = await Promise.all([
    eventSupportRepo.findByAnchorEventId(anchorEventId),
    batchSupportOverrideRepo.findByBatchId(batchId),
  ]);

  const resolved = resolveSupportResourceTemplates({
    eventResources,
    batchOverrides,
    prId,
    location,
    timeWindow,
  });

  return await prSupportRepo.replaceByPrId(prId, resolved);
}
