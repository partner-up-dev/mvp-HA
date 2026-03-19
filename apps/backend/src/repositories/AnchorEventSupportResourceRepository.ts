import { asc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorEventSupportResources,
  type AnchorEventSupportResource,
  type AnchorEventId,
  type NewAnchorEventSupportResource,
} from "../entities";

export class AnchorEventSupportResourceRepository {
  async findByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorEventSupportResource[]> {
    return await db
      .select()
      .from(anchorEventSupportResources)
      .where(eq(anchorEventSupportResources.anchorEventId, anchorEventId))
      .orderBy(
        asc(anchorEventSupportResources.displayOrder),
        asc(anchorEventSupportResources.id),
      );
  }

  async replaceByAnchorEventId(
    anchorEventId: AnchorEventId,
    rows: NewAnchorEventSupportResource[],
  ): Promise<AnchorEventSupportResource[]> {
    return await db.transaction(async (tx) => {
      await tx
        .delete(anchorEventSupportResources)
        .where(eq(anchorEventSupportResources.anchorEventId, anchorEventId));

      if (rows.length === 0) {
        return [];
      }

      const inserted = await tx
        .insert(anchorEventSupportResources)
        .values(rows)
        .returning();

      return inserted.sort(
        (a, b) =>
          a.displayOrder - b.displayOrder ||
          a.id - b.id,
      );
    });
  }
}
