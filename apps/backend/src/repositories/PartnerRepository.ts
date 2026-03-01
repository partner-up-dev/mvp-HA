import { db } from "../lib/db";
import {
  partners,
  type PartnerId,
  type PartnerStatus,
} from "../entities/partner";
import type { PRId } from "../entities/partner-request";
import type { UserId } from "../entities/user";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

export class PartnerRepository {
  async findById(id: PartnerId) {
    const result = await db.select().from(partners).where(eq(partners.id, id));
    return result[0] ?? null;
  }

  async findByPrId(prId: PRId) {
    return db
      .select()
      .from(partners)
      .where(eq(partners.prId, prId))
      .orderBy(asc(partners.id));
  }

  async findActiveByPrIdAndUserId(prId: PRId, userId: UserId) {
    const result = await db
      .select()
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          eq(partners.userId, userId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .orderBy(desc(partners.id));
    return result[0] ?? null;
  }

  async findActiveByUserId(userId: UserId) {
    return db
      .select()
      .from(partners)
      .where(
        and(
          eq(partners.userId, userId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .orderBy(desc(partners.id));
  }

  async findFirstReleasedSlot(prId: PRId) {
    const result = await db
      .select()
      .from(partners)
      .where(and(eq(partners.prId, prId), eq(partners.status, "RELEASED")))
      .orderBy(asc(partners.id));
    return result[0] ?? null;
  }

  async listActiveIdsByPrId(prId: PRId): Promise<PartnerId[]> {
    const rows = await db
      .select({ id: partners.id })
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .orderBy(asc(partners.id));
    return rows.map((row) => row.id);
  }

  async countActiveByPrId(prId: PRId): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      );
    return result[0]?.count ?? 0;
  }

  async countTotalByPrId(prId: PRId): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(partners)
      .where(eq(partners.prId, prId));
    return result[0]?.count ?? 0;
  }

  async createSlot(data: {
    prId: PRId;
    userId?: UserId | null;
    status?: PartnerStatus;
  }) {
    const now = new Date();
    const nextStatus = data.status ?? "RELEASED";
    const result = await db
      .insert(partners)
      .values({
        prId: data.prId,
        userId: data.userId ?? null,
        status: nextStatus,
        confirmedAt: nextStatus === "CONFIRMED" ? now : null,
        releasedAt: nextStatus === "RELEASED" ? now : null,
      })
      .returning();
    return result[0] ?? null;
  }

  async createReleasedSlots(prId: PRId, count: number) {
    if (count <= 0) return;
    const now = new Date();
    const rows: Array<typeof partners.$inferInsert> = Array.from(
      { length: count },
      () => ({
        prId,
        userId: null,
        status: "RELEASED",
        releasedAt: now,
      }),
    );
    await db.insert(partners).values(rows);
  }

  async assignSlot(
    id: PartnerId,
    userId: UserId,
    status: Exclude<PartnerStatus, "RELEASED" | "ATTENDED">,
  ) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        userId,
        status,
        confirmedAt: status === "CONFIRMED" ? now : null,
        releasedAt: null,
        attendedAt: null,
        checkInAt: null,
        didAttend: null,
        wouldJoinAgain: null,
        paymentStatus: "NONE",
        reimbursementRequested: false,
        reimbursementStatus: "NONE",
        reimbursementAmount: null,
        reimbursementRequestedAt: null,
        reimbursementReviewedAt: null,
        reimbursementPaidAt: null,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async bindUserIfUnbound(id: PartnerId, userId: UserId) {
    const result = await db
      .update(partners)
      .set({ userId })
      .where(and(eq(partners.id, id), isNull(partners.userId)))
      .returning();
    return result[0] ?? null;
  }

  async updateStatus(
    id: PartnerId,
    status: PartnerStatus,
    userId?: UserId | null,
  ) {
    const result = await db
      .update(partners)
      .set({ status, userId })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async markConfirmed(id: PartnerId) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status: "CONFIRMED",
        confirmedAt: now,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async markReleased(id: PartnerId) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status: "RELEASED",
        userId: null,
        confirmedAt: null,
        attendedAt: null,
        checkInAt: null,
        didAttend: null,
        wouldJoinAgain: null,
        paymentStatus: "NONE",
        reimbursementRequested: false,
        reimbursementStatus: "NONE",
        reimbursementAmount: null,
        reimbursementRequestedAt: null,
        reimbursementReviewedAt: null,
        reimbursementPaidAt: null,
        releasedAt: now,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async reportCheckIn(
    id: PartnerId,
    payload: {
      didAttend: boolean;
      wouldJoinAgain: boolean | null;
    },
  ) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status: payload.didAttend ? "ATTENDED" : undefined,
        attendedAt: payload.didAttend ? now : undefined,
        checkInAt: now,
        didAttend: payload.didAttend,
        wouldJoinAgain: payload.wouldJoinAgain,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async deleteByIds(ids: PartnerId[]) {
    if (ids.length === 0) return;
    await db.delete(partners).where(inArray(partners.id, ids));
  }
}
