import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  prBookingExecutions,
  type PRBookingExecution,
  type NewPRBookingExecution,
  type PRId,
} from "../entities";

export class PRBookingExecutionRepository {
  async create(
    data: NewPRBookingExecution,
  ): Promise<PRBookingExecution | null> {
    const result = await db
      .insert(prBookingExecutions)
      .values(data)
      .returning();
    return result[0] ?? null;
  }

  async findByPrId(prId: PRId): Promise<PRBookingExecution | null> {
    const result = await db
      .select()
      .from(prBookingExecutions)
      .where(eq(prBookingExecutions.prId, prId))
      .orderBy(desc(prBookingExecutions.createdAt));
    return result[0] ?? null;
  }

  async deleteById(id: PRBookingExecution["id"]): Promise<void> {
    await db
      .delete(prBookingExecutions)
      .where(eq(prBookingExecutions.id, id));
  }

  async updateNotificationSummary(
    id: PRBookingExecution["id"],
    summary: {
      targetCount: number;
      successCount: number;
      failureCount: number;
      skippedCount: number;
    },
  ): Promise<PRBookingExecution | null> {
    const result = await db
      .update(prBookingExecutions)
      .set({
        notificationTargetCount: summary.targetCount,
        notificationSuccessCount: summary.successCount,
        notificationFailureCount: summary.failureCount,
        notificationSkippedCount: summary.skippedCount,
      })
      .where(eq(prBookingExecutions.id, id))
      .returning();
    return result[0] ?? null;
  }

  async listAll(): Promise<PRBookingExecution[]> {
    return db
      .select()
      .from(prBookingExecutions)
      .orderBy(desc(prBookingExecutions.createdAt));
  }
}
