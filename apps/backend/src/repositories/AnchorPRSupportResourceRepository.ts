import { asc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorPRSupportResources,
  type AnchorPRSupportResource,
  type NewAnchorPRSupportResource,
  type PRId,
} from "../entities";

export class AnchorPRSupportResourceRepository {
  async findByPrId(prId: PRId): Promise<AnchorPRSupportResource[]> {
    return await db
      .select()
      .from(anchorPRSupportResources)
      .where(eq(anchorPRSupportResources.prId, prId))
      .orderBy(
        asc(anchorPRSupportResources.displayOrder),
        asc(anchorPRSupportResources.id),
      );
  }

  async replaceByPrId(
    prId: PRId,
    rows: NewAnchorPRSupportResource[],
  ): Promise<AnchorPRSupportResource[]> {
    return await db.transaction(async (tx) => {
      await tx
        .delete(anchorPRSupportResources)
        .where(eq(anchorPRSupportResources.prId, prId));

      if (rows.length === 0) {
        return [];
      }

      const inserted = await tx
        .insert(anchorPRSupportResources)
        .values(rows)
        .returning();

      return inserted.sort(
        (a, b) =>
          a.displayOrder - b.displayOrder ||
          a.id - b.id,
      );
    });
  }

  async deleteByPrId(prId: PRId): Promise<void> {
    await db
      .delete(anchorPRSupportResources)
      .where(eq(anchorPRSupportResources.prId, prId));
  }
}
