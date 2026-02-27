import { db } from "../lib/db";
import {
  anchorEvents,
  type AnchorEvent,
  type AnchorEventId,
  type NewAnchorEvent,
  type AnchorEventStatus,
} from "../entities/anchor-event";
import { eq, inArray, desc } from "drizzle-orm";

export class AnchorEventRepository {
  async create(data: NewAnchorEvent): Promise<AnchorEvent> {
    const result = await db.insert(anchorEvents).values(data).returning();
    return result[0];
  }

  async findById(id: AnchorEventId): Promise<AnchorEvent | null> {
    const result = await db
      .select()
      .from(anchorEvents)
      .where(eq(anchorEvents.id, id));
    return result[0] ?? null;
  }

  async findByStatuses(statuses: AnchorEventStatus[]): Promise<AnchorEvent[]> {
    if (statuses.length === 0) return [];
    return await db
      .select()
      .from(anchorEvents)
      .where(inArray(anchorEvents.status, statuses))
      .orderBy(desc(anchorEvents.createdAt));
  }

  async listActive(): Promise<AnchorEvent[]> {
    return this.findByStatuses(["ACTIVE"]);
  }

  async updateStatus(
    id: AnchorEventId,
    status: AnchorEventStatus,
  ): Promise<AnchorEvent | null> {
    const result = await db
      .update(anchorEvents)
      .set({ status, updatedAt: new Date() })
      .where(eq(anchorEvents.id, id))
      .returning();
    return result[0] ?? null;
  }
}
