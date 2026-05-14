import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventSupportResourceRepository } from "../../../repositories/AnchorEventSupportResourceRepository";
import type { AnchorEventId, AnchorEventSupportResource } from "../../../entities";

const eventRepo = new AnchorEventRepository();
const eventSupportRepo = new AnchorEventSupportResourceRepository();

export interface AdminBookingSupportConfig {
  event: {
    id: number;
    title: string;
  };
  resources: AnchorEventSupportResource[];
}

export async function getAdminBookingSupportConfig(
  eventId: AnchorEventId,
): Promise<AdminBookingSupportConfig> {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  const resources = await eventSupportRepo.findByAnchorEventId(eventId);

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    resources,
  };
}
