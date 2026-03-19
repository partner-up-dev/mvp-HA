import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { AnchorEventSupportResourceRepository } from "../../../repositories/AnchorEventSupportResourceRepository";
import { AnchorEventBatchSupportOverrideRepository } from "../../../repositories/AnchorEventBatchSupportOverrideRepository";
import type {
  AnchorEventBatchSupportOverride,
  AnchorEventId,
  AnchorEventSupportResource,
} from "../../../entities";

const eventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const eventSupportRepo = new AnchorEventSupportResourceRepository();
const batchOverrideRepo = new AnchorEventBatchSupportOverrideRepository();

export interface AdminBookingSupportConfig {
  event: {
    id: number;
    title: string;
  };
  resources: AnchorEventSupportResource[];
  batches: Array<{
    id: number;
    timeWindow: [string | null, string | null];
    overrides: AnchorEventBatchSupportOverride[];
  }>;
}

export async function getAdminBookingSupportConfig(
  eventId: AnchorEventId,
): Promise<AdminBookingSupportConfig> {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const [resources, batches] = await Promise.all([
    eventSupportRepo.findByAnchorEventId(eventId),
    batchRepo.findByAnchorEventId(eventId),
  ]);

  const batchEntries = await Promise.all(
    batches.map(async (batch) => ({
      id: batch.id,
      timeWindow: batch.timeWindow,
      overrides: await batchOverrideRepo.findByBatchId(batch.id),
    })),
  );

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    resources,
    batches: batchEntries,
  };
}
