import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  communityPartnerRequests,
  type CommunityPartnerRequest,
  type NewCommunityPartnerRequest,
} from "../entities/community-partner-request";
import type { PRId } from "../entities/partner-request";

export class CommunityPRRepository {
  async create(
    data: NewCommunityPartnerRequest,
  ): Promise<CommunityPartnerRequest> {
    const result = await db
      .insert(communityPartnerRequests)
      .values(data)
      .returning();
    return result[0];
  }

  async findByPrId(prId: PRId): Promise<CommunityPartnerRequest | null> {
    const result = await db
      .select()
      .from(communityPartnerRequests)
      .where(eq(communityPartnerRequests.prId, prId));
    return result[0] ?? null;
  }

  async updateBudget(
    prId: PRId,
    budget: string | null,
  ): Promise<CommunityPartnerRequest | null> {
    const result = await db
      .update(communityPartnerRequests)
      .set({ budget })
      .where(eq(communityPartnerRequests.prId, prId))
      .returning();
    return result[0] ?? null;
  }
}
