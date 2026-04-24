import type { PartnerRequestFields, PRId } from "../../../entities";
import { AnchorEventSupportResourceRepository } from "../../../repositories/AnchorEventSupportResourceRepository";
import { PRSupportResourceRepository } from "../../../repositories/PRSupportResourceRepository";
import { type AnchorEventId } from "../../../entities/anchor-event";
import { resolveSupportResourceTemplates } from "./resolve-support-resource-templates";

const eventSupportRepo = new AnchorEventSupportResourceRepository();
const prSupportRepo = new PRSupportResourceRepository();

export interface MaterializePRSupportResourcesInput {
  prId: PRId;
  anchorEventId: AnchorEventId;
  location: string | null;
  timeWindow: PartnerRequestFields["time"];
}

export async function materializePRSupportResources({
  prId,
  anchorEventId,
  location,
  timeWindow,
}: MaterializePRSupportResourcesInput) {
  const eventResources = await eventSupportRepo.findByAnchorEventId(anchorEventId);

  const resolved = resolveSupportResourceTemplates({
    eventResources,
    prId,
    location,
    timeWindow,
  });

  return await prSupportRepo.replaceByPrId(prId, resolved);
}
