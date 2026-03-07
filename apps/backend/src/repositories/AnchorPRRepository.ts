import { and, desc, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorPartnerRequests,
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

  async updateVisibilityStatus(
    prId: PRId,
    visibilityStatus: VisibilityStatus,
  ): Promise<void> {
    await db
      .update(anchorPartnerRequests)
      .set({ visibilityStatus })
      .where(eq(anchorPartnerRequests.prId, prId));
  }
}

