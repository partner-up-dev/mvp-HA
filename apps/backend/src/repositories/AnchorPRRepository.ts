import { and, count, desc, eq, isNotNull, notInArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorPartnerRequests,
  type AnchorLocationSource,
  type AnchorPartnerRequest,
  type NewAnchorPartnerRequest,
} from "../entities/anchor-partner-request";
import type { AnchorEventId } from "../entities/anchor-event";
import type { AnchorEventBatchId } from "../entities/anchor-event-batch";
import {
  partnerRequests,
  type PartnerRequest,
  type PRId,
  type VisibilityStatus,
} from "../entities/partner-request";
import type { AnchorPartnerRequest as AnchorPR } from "../entities/anchor-partner-request";

export type AnchorPRRecord = {
  root: PartnerRequest;
  anchor: AnchorPartnerRequest;
};

export class AnchorPRRepository {
  async create(data: NewAnchorPartnerRequest): Promise<AnchorPartnerRequest> {
    const result = await db
      .insert(anchorPartnerRequests)
      .values(data)
      .returning();
    return result[0];
  }

  async findByPrId(prId: PRId): Promise<AnchorPartnerRequest | null> {
    const result = await db
      .select()
      .from(anchorPartnerRequests)
      .where(eq(anchorPartnerRequests.prId, prId));
    return result[0] ?? null;
  }

  async findRecordByPrId(prId: PRId): Promise<AnchorPRRecord | null> {
    const result = await db
      .select({
        root: partnerRequests,
        anchor: anchorPartnerRequests,
      })
      .from(anchorPartnerRequests)
      .innerJoin(partnerRequests, eq(partnerRequests.id, anchorPartnerRequests.prId))
      .where(eq(anchorPartnerRequests.prId, prId));
    return result[0] ?? null;
  }

  async findVisibleByBatchId(
    batchId: AnchorEventBatchId,
  ): Promise<AnchorPRRecord[]> {
    return await db
      .select({
        root: partnerRequests,
        anchor: anchorPartnerRequests,
      })
      .from(anchorPartnerRequests)
      .innerJoin(partnerRequests, eq(partnerRequests.id, anchorPartnerRequests.prId))
      .where(
        and(
          eq(anchorPartnerRequests.batchId, batchId),
          eq(anchorPartnerRequests.visibilityStatus, "VISIBLE"),
        ),
      )
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findByBatchId(batchId: AnchorEventBatchId): Promise<AnchorPRRecord[]> {
    return await db
      .select({
        root: partnerRequests,
        anchor: anchorPartnerRequests,
      })
      .from(anchorPartnerRequests)
      .innerJoin(partnerRequests, eq(partnerRequests.id, anchorPartnerRequests.prId))
      .where(eq(anchorPartnerRequests.batchId, batchId))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findVisibleByBatchIdAndLocation(
    batchId: AnchorEventBatchId,
    location: string,
  ): Promise<AnchorPRRecord[]> {
    return await db
      .select({
        root: partnerRequests,
        anchor: anchorPartnerRequests,
      })
      .from(anchorPartnerRequests)
      .innerJoin(partnerRequests, eq(partnerRequests.id, anchorPartnerRequests.prId))
      .where(
        and(
          eq(anchorPartnerRequests.batchId, batchId),
          eq(partnerRequests.location, location),
          eq(anchorPartnerRequests.visibilityStatus, "VISIBLE"),
        ),
      )
      .orderBy(desc(partnerRequests.createdAt));
  }

  async countActiveVisibleByBatchAndLocationSource(
    batchId: AnchorEventBatchId,
    location: string,
    locationSource: "SYSTEM" | "USER",
  ): Promise<number> {
    const rows = await db
      .select({ value: count() })
      .from(anchorPartnerRequests)
      .innerJoin(partnerRequests, eq(partnerRequests.id, anchorPartnerRequests.prId))
      .where(
        and(
          eq(anchorPartnerRequests.batchId, batchId),
          eq(anchorPartnerRequests.locationSource, locationSource),
          eq(anchorPartnerRequests.visibilityStatus, "VISIBLE"),
          eq(partnerRequests.location, location),
          notInArray(partnerRequests.status, ["CLOSED", "EXPIRED"]),
        ),
      );
    return rows[0]?.value ?? 0;
  }

  async findVisibleByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorPRRecord[]> {
    return await db
      .select({
        root: partnerRequests,
        anchor: anchorPartnerRequests,
      })
      .from(anchorPartnerRequests)
      .innerJoin(partnerRequests, eq(partnerRequests.id, anchorPartnerRequests.prId))
      .where(
        and(
          eq(anchorPartnerRequests.anchorEventId, anchorEventId),
          eq(anchorPartnerRequests.visibilityStatus, "VISIBLE"),
        ),
      )
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorPRRecord[]> {
    return await db
      .select({
        root: partnerRequests,
        anchor: anchorPartnerRequests,
      })
      .from(anchorPartnerRequests)
      .innerJoin(partnerRequests, eq(partnerRequests.id, anchorPartnerRequests.prId))
      .where(eq(anchorPartnerRequests.anchorEventId, anchorEventId))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async findBookingTriggeredRecords(): Promise<AnchorPRRecord[]> {
    return db
      .select({
        root: partnerRequests,
        anchor: anchorPartnerRequests,
      })
      .from(anchorPartnerRequests)
      .innerJoin(
        partnerRequests,
        eq(partnerRequests.id, anchorPartnerRequests.prId),
      )
      .where(isNotNull(anchorPartnerRequests.bookingTriggeredAt))
      .orderBy(desc(anchorPartnerRequests.bookingTriggeredAt));
  }

  async updateVisibilityStatus(
    prId: PRId,
    visibilityStatus: VisibilityStatus,
  ): Promise<void> {
    await db
      .update(anchorPartnerRequests)
      .set({ visibilityStatus })
      .where(eq(anchorPartnerRequests.prId, prId));
  }

  async updateParticipationPolicy(
    prId: PRId,
    data: Pick<
      AnchorPR,
      | "confirmationStartOffsetMinutes"
      | "confirmationEndOffsetMinutes"
      | "joinLockOffsetMinutes"
    >,
  ): Promise<AnchorPartnerRequest | null> {
    const result = await db
      .update(anchorPartnerRequests)
      .set({
        confirmationStartOffsetMinutes: data.confirmationStartOffsetMinutes,
        confirmationEndOffsetMinutes: data.confirmationEndOffsetMinutes,
        joinLockOffsetMinutes: data.joinLockOffsetMinutes,
      })
      .where(eq(anchorPartnerRequests.prId, prId))
      .returning();
    return result[0] ?? null;
  }

  async updateLocationSource(
    prId: PRId,
    locationSource: AnchorLocationSource,
  ): Promise<AnchorPartnerRequest | null> {
    const result = await db
      .update(anchorPartnerRequests)
      .set({ locationSource })
      .where(eq(anchorPartnerRequests.prId, prId))
      .returning();
    return result[0] ?? null;
  }

  async updateBookingTriggeredAt(
    prId: PRId,
    bookingTriggeredAt: Date | null,
  ): Promise<AnchorPartnerRequest | null> {
    const result = await db
      .update(anchorPartnerRequests)
      .set({ bookingTriggeredAt })
      .where(eq(anchorPartnerRequests.prId, prId))
      .returning();
    return result[0] ?? null;
  }
}
