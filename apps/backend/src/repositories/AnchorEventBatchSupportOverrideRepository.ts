import { asc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorEventBatchSupportOverrides,
  type AnchorEventBatchId,
  type AnchorEventBatchSupportOverride,
  type NewAnchorEventBatchSupportOverride,
} from "../entities";

export class AnchorEventBatchSupportOverrideRepository {
  async findByBatchId(
    batchId: AnchorEventBatchId,
  ): Promise<AnchorEventBatchSupportOverride[]> {
    return await db
      .select()
      .from(anchorEventBatchSupportOverrides)
      .where(eq(anchorEventBatchSupportOverrides.batchId, batchId))
      .orderBy(
        asc(anchorEventBatchSupportOverrides.displayOrderOverride),
        asc(anchorEventBatchSupportOverrides.id),
      );
  }

  async replaceByBatchId(
    batchId: AnchorEventBatchId,
    rows: NewAnchorEventBatchSupportOverride[],
  ): Promise<AnchorEventBatchSupportOverride[]> {
    return await db.transaction(async (tx) => {
      await tx
        .delete(anchorEventBatchSupportOverrides)
        .where(eq(anchorEventBatchSupportOverrides.batchId, batchId));

      if (rows.length === 0) {
        return [];
      }

      const inserted = await tx
        .insert(anchorEventBatchSupportOverrides)
        .values(rows)
        .returning();

      return inserted.sort(
        (a, b) =>
          (a.displayOrderOverride ?? Number.MAX_SAFE_INTEGER) -
            (b.displayOrderOverride ?? Number.MAX_SAFE_INTEGER) ||
          a.id - b.id,
      );
    });
  }
}
