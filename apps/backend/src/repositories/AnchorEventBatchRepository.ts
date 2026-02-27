import { db } from "../lib/db";
import {
  anchorEventBatches,
  type AnchorEventBatch,
  type AnchorEventBatchId,
  type NewAnchorEventBatch,
  type AnchorEventBatchStatus,
} from "../entities/anchor-event-batch";
import type { AnchorEventId } from "../entities/anchor-event";
import { eq, and, desc } from "drizzle-orm";

export class AnchorEventBatchRepository {
  async create(data: NewAnchorEventBatch): Promise<AnchorEventBatch> {
    const result = await db.insert(anchorEventBatches).values(data).returning();
    return result[0];
  }

  async findById(id: AnchorEventBatchId): Promise<AnchorEventBatch | null> {
    const result = await db
      .select()
      .from(anchorEventBatches)
      .where(eq(anchorEventBatches.id, id));
    return result[0] ?? null;
  }

  async findByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorEventBatch[]> {
    return await db
      .select()
      .from(anchorEventBatches)
      .where(eq(anchorEventBatches.anchorEventId, anchorEventId))
      .orderBy(desc(anchorEventBatches.createdAt));
  }

  async findByAnchorEventIdAndStatus(
    anchorEventId: AnchorEventId,
    status: AnchorEventBatchStatus,
  ): Promise<AnchorEventBatch[]> {
    return await db
      .select()
      .from(anchorEventBatches)
      .where(
        and(
          eq(anchorEventBatches.anchorEventId, anchorEventId),
          eq(anchorEventBatches.status, status),
        ),
      );
  }

  async findByAnchorEventIdAndTimeWindow(
    anchorEventId: AnchorEventId,
    timeWindow: [string | null, string | null],
  ): Promise<AnchorEventBatch | null> {
    const batches = await this.findByAnchorEventId(anchorEventId);
    const [targetStart, targetEnd] = timeWindow;
    const matched = batches.find(
      (batch) =>
        batch.timeWindow[0] === targetStart &&
        batch.timeWindow[1] === targetEnd,
    );
    return matched ?? null;
  }

  async updateStatus(
    id: AnchorEventBatchId,
    status: AnchorEventBatchStatus,
  ): Promise<AnchorEventBatch | null> {
    const result = await db
      .update(anchorEventBatches)
      .set({ status })
      .where(eq(anchorEventBatches.id, id))
      .returning();
    return result[0] ?? null;
  }
}
