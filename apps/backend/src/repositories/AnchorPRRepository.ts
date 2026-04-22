import { and, count, desc, eq, inArray, notInArray } from "drizzle-orm";
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
  type PRStatus,
  type VisibilityStatus,
} from "../entities/partner-request";
import type { AnchorPartnerRequest as AnchorPR } from "../entities/anchor-partner-request";
import { PartnerRequestRepository } from "./PartnerRequestRepository";

export type AnchorPRRecord = {
  root: PartnerRequest;
  anchor: AnchorPartnerRequest;
};

export class AnchorPRRepository {
  private readonly prRootRepo = new PartnerRequestRepository();

  async create(data: NewAnchorPartnerRequest): Promise<AnchorPartnerRequest> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .insert(anchorPartnerRequests)
        .values(data)
        .returning();
      const created = result[0];

      await tx
        .update(partnerRequests)
        .set({
          visibilityStatus: created.visibilityStatus,
          confirmationStartOffsetMinutes:
            created.confirmationStartOffsetMinutes,
          confirmationEndOffsetMinutes: created.confirmationEndOffsetMinutes,
          joinLockOffsetMinutes: created.joinLockOffsetMinutes,
        })
        .where(eq(partnerRequests.id, created.prId));

      return created;
    });
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

  async findByRootStatuses(statuses: PRStatus[]): Promise<AnchorPRRecord[]> {
    if (statuses.length === 0) return [];

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
      .where(inArray(partnerRequests.status, statuses))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async updateVisibilityStatus(
    prId: PRId,
    visibilityStatus: VisibilityStatus,
  ): Promise<void> {
    await db
      .update(anchorPartnerRequests)
      .set({ visibilityStatus })
      .where(eq(anchorPartnerRequests.prId, prId));
    await this.prRootRepo.updateVisibilityStatus(prId, visibilityStatus);
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
    await this.prRootRepo.updatePartnerRules(prId, {
      confirmationStartOffsetMinutes: data.confirmationStartOffsetMinutes,
      confirmationEndOffsetMinutes: data.confirmationEndOffsetMinutes,
      joinLockOffsetMinutes: data.joinLockOffsetMinutes,
    });
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
