import { asc, eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  prSupportResources,
  type PRSupportResource,
  type NewPRSupportResource,
  type PRId,
} from "../entities";

export class PRSupportResourceRepository {
  async findByPrId(prId: PRId): Promise<PRSupportResource[]> {
    return await db
      .select()
      .from(prSupportResources)
      .where(eq(prSupportResources.prId, prId))
      .orderBy(
        asc(prSupportResources.displayOrder),
        asc(prSupportResources.id),
      );
  }

  async replaceByPrId(
    prId: PRId,
    rows: NewPRSupportResource[],
  ): Promise<PRSupportResource[]> {
    return await db.transaction(async (tx) => {
      await tx
        .delete(prSupportResources)
        .where(eq(prSupportResources.prId, prId));

      if (rows.length === 0) {
        return [];
      }

      const inserted = await tx
        .insert(prSupportResources)
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
      .delete(prSupportResources)
      .where(eq(prSupportResources.prId, prId));
  }

  async countByPrId(prId: PRId): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(prSupportResources)
      .where(eq(prSupportResources.prId, prId));
    return result[0]?.count ?? 0;
  }
}
