import { db } from "../lib/db";
import {
  partners,
  type PartnerId,
  type PartnerStatus,
} from "../entities/partner";
import type { PRId } from "../entities/partner-request";
import type { UserId } from "../entities/user";
import { users } from "../entities/user";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";

export type ActiveParticipantSummary = {
  partnerId: PartnerId;
  status: Extract<PartnerStatus, "JOINED" | "CONFIRMED" | "ATTENDED">;
  userId: UserId;
  nickname: string | null;
  avatar: string | null;
};

export type RosterParticipantSummary = {
  partnerId: PartnerId;
  status: PartnerStatus;
  userId: UserId | null;
  nickname: string | null;
  avatar: string | null;
  releasedAt?: Date | null;
  releaseReason?: string | null;
};

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

  async listActiveParticipantSummariesByPrId(
    prId: PRId,
  ): Promise<ActiveParticipantSummary[]> {
    const rows = await db
      .select({
        partnerId: partners.id,
        status: partners.status,
        userId: partners.userId,
        nickname: users.nickname,
        avatar: users.avatar,
      })
      .from(partners)
      .leftJoin(users, eq(users.id, partners.userId))
      .where(
        and(
          eq(partners.prId, prId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      )
      .orderBy(asc(partners.id));

    return rows.map((row) => ({
      partnerId: row.partnerId,
      status: row.status as Extract<PartnerStatus, "JOINED" | "CONFIRMED" | "ATTENDED">,
      userId: row.userId,
      nickname: row.nickname,
      avatar: row.avatar,
    }));
  }

  async listRosterParticipantSummariesByPrId(
    prId: PRId,
  ): Promise<RosterParticipantSummary[]> {
    const rows = await db
      .select({
        partnerId: partners.id,
        status: partners.status,
        userId: partners.userId,
        nickname: users.nickname,
        avatar: users.avatar,
        releasedAt: partners.releasedAt,
        releaseReason: partners.releaseReason,
      })
      .from(partners)
      .leftJoin(users, eq(users.id, partners.userId))
      .where(
        and(
          eq(partners.prId, prId),
          inArray(partners.status, [
            "JOINED",
            "CONFIRMED",
            "ATTENDED",
            "EXITED",
            "RELEASED",
          ]),
          sql`${partners.userId} is not null`,
        ),
      )
      .orderBy(asc(partners.id));

    return rows.map((row) => ({
      partnerId: row.partnerId,
      status: row.status as PartnerStatus,
      userId: row.userId,
      nickname: row.nickname,
      avatar: row.avatar,
      releasedAt: row.releasedAt,
      releaseReason: row.releaseReason,
    }));
  }

  async findActiveParticipantSummaryByPrIdAndPartnerId(
    prId: PRId,
    partnerId: PartnerId,
  ): Promise<ActiveParticipantSummary | null> {
    const rows = await db
      .select({
        partnerId: partners.id,
        status: partners.status,
        userId: partners.userId,
        nickname: users.nickname,
        avatar: users.avatar,
      })
      .from(partners)
      .leftJoin(users, eq(users.id, partners.userId))
      .where(
        and(
          eq(partners.prId, prId),
          eq(partners.id, partnerId),
          inArray(partners.status, ["JOINED", "CONFIRMED", "ATTENDED"]),
        ),
      );

    const row = rows[0] ?? null;
    if (!row) {
      return null;
    }

    return {
      partnerId: row.partnerId,
      status: row.status as Extract<PartnerStatus, "JOINED" | "CONFIRMED" | "ATTENDED">,
      userId: row.userId,
      nickname: row.nickname,
      avatar: row.avatar,
    };
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
    userId: UserId;
    status: PartnerStatus;
  }) {
    const now = new Date();
    const nextStatus = data.status;
    const result = await db
      .insert(partners)
      .values({
        prId: data.prId,
        userId: data.userId,
        status: nextStatus,
        exitedAt: nextStatus === "EXITED" ? now : null,
        confirmedAt: nextStatus === "CONFIRMED" ? now : null,
        releasedAt: nextStatus === "RELEASED" ? now : null,
        releaseReason: null,
      })
      .returning();
    return result[0] ?? null;
  }

  async updateStatus(id: PartnerId, status: PartnerStatus) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status,
        exitedAt: status === "EXITED" ? now : null,
        releasedAt: status === "RELEASED" ? now : null,
        releaseReason: null,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async reactivateSlot(
    id: PartnerId,
    status: Extract<PartnerStatus, "JOINED" | "CONFIRMED">,
  ) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status,
        confirmedAt: status === "CONFIRMED" ? now : null,
        exitedAt: null,
        releasedAt: null,
        releaseReason: null,
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

  async markReleased(
    id: PartnerId,
    options: {
      releaseReason?: string | null;
    } = {},
  ) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status: "RELEASED",
        exitedAt: null,
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
        releaseReason: options.releaseReason ?? null,
      })
      .where(eq(partners.id, id))
      .returning();
    return result[0] ?? null;
  }

  async findReleasedByPrIdAndUserId(prId: PRId, userId: UserId) {
    const result = await db
      .select()
      .from(partners)
      .where(
        and(
          eq(partners.prId, prId),
          eq(partners.userId, userId),
          inArray(partners.status, ["RELEASED", "EXITED"]),
        ),
      )
      .orderBy(desc(partners.id));
    return result[0] ?? null;
  }

  async reportCheckIn(
    id: PartnerId,
    payload: {
      wouldJoinAgain: boolean | null;
    },
  ) {
    const now = new Date();
    const result = await db
      .update(partners)
      .set({
        status: "ATTENDED",
        attendedAt: now,
        checkInAt: now,
        didAttend: true,
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
