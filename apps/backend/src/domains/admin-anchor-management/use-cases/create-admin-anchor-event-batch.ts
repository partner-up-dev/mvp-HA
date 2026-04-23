import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import type {
  AnchorEventBatch,
  AnchorEventBatchStatus,
  AnchorEventId,
} from "../../../entities";
import { syncAnchorEventTimeWindowPool } from "../services/sync-anchor-event-time-window-pool";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

export interface CreateAdminAnchorEventBatchInput {
  timeWindow: [string | null, string | null];
  status: AnchorEventBatchStatus;
  description: string | null;
  earliestLeadMinutes: number | null;
}

export async function createAdminAnchorEventBatch(
  eventId: AnchorEventId,
  input: CreateAdminAnchorEventBatchInput,
): Promise<AnchorEventBatch> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const created = await batchRepo.create({
    anchorEventId: eventId,
    timeWindow: input.timeWindow,
    status: input.status,
    description: input.description,
    earliestLeadMinutes: input.earliestLeadMinutes,
  });

  await syncAnchorEventTimeWindowPool(eventId);
  return created;
}
