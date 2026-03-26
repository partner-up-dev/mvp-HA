import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorPRBookingExecutions,
  type AnchorPRBookingExecution,
  type NewAnchorPRBookingExecution,
  type PRId,
} from "../entities";

export class AnchorPRBookingExecutionRepository {
  async create(
    data: NewAnchorPRBookingExecution,
  ): Promise<AnchorPRBookingExecution | null> {
    const result = await db
      .insert(anchorPRBookingExecutions)
      .values(data)
      .returning();
    return result[0] ?? null;
  }

  async findByPrId(prId: PRId): Promise<AnchorPRBookingExecution | null> {
    const result = await db
      .select()
      .from(anchorPRBookingExecutions)
      .where(eq(anchorPRBookingExecutions.prId, prId))
      .orderBy(desc(anchorPRBookingExecutions.createdAt));
    return result[0] ?? null;
  }

  async listAll(): Promise<AnchorPRBookingExecution[]> {
    return db
      .select()
      .from(anchorPRBookingExecutions)
      .orderBy(desc(anchorPRBookingExecutions.createdAt));
  }
}
