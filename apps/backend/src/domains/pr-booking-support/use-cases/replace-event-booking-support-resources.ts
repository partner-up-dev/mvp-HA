import type {
  AnchorEventId,
  AnchorEventSupportResource,
  NewAnchorEventSupportResource,
} from "../../../entities";
import { AnchorEventSupportResourceRepository } from "../../../repositories/AnchorEventSupportResourceRepository";

const eventSupportRepo = new AnchorEventSupportResourceRepository();

export async function replaceEventBookingSupportResources(
  anchorEventId: AnchorEventId,
  rows: Omit<NewAnchorEventSupportResource, "anchorEventId">[],
): Promise<AnchorEventSupportResource[]> {
  return await eventSupportRepo.replaceByAnchorEventId(
    anchorEventId,
    rows.map((row) => ({
      ...row,
      anchorEventId,
    })),
  );
}
