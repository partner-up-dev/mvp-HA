import { db } from "../lib/db";
import {
  partnerRequests,
  type NewPartnerRequest,
  type PRStatus,
  type ParsedPartnerRequest,
  type PRId,
  type XiaohongshuPosterCache,
  type WechatThumbnailCache,
  type PartnerRequest,
} from "../entities/partner-request";
import { desc, eq, inArray } from "drizzle-orm";

export class PartnerRequestRepository {
  async create(data: NewPartnerRequest) {
    const result = await db.insert(partnerRequests).values(data).returning();
    return result[0];
  }

  async findById(id: PRId) {
    const result = await db
      .select()
      .from(partnerRequests)
      .where(eq(partnerRequests.id, id));
    return result[0] || null;
  }

  async findByIds(ids: PRId[]) {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(partnerRequests)
      .where(inArray(partnerRequests.id, ids))
      .orderBy(desc(partnerRequests.createdAt));
  }

  async updateStatus(id: PRId, status: PRStatus) {
    const result = await db
      .update(partnerRequests)
      .set({ status })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async updateParsed(id: PRId, parsed: ParsedPartnerRequest) {
    const result = await db
      .update(partnerRequests)
      .set({ parsed })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async incrementParticipants(id: PRId) {
    const pr = await this.findById(id);
    if (!pr) return null;

    const result = await db
      .update(partnerRequests)
      .set({ participants: (pr.participants || 0) + 1 })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async decrementParticipants(id: PRId) {
    const pr = await this.findById(id);
    if (!pr) return null;

    const newCount = Math.max(0, (pr.participants || 0) - 1);
    const result = await db
      .update(partnerRequests)
      .set({ participants: newCount })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async addXiaohongshuPoster(
    id: PRId,
    cache: XiaohongshuPosterCache,
  ): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({ xiaohongshuPoster: cache })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async addWechatThumbnail(
    id: PRId,
    cache: WechatThumbnailCache,
  ): Promise<PartnerRequest | null> {
    const result = await db
      .update(partnerRequests)
      .set({ wechatThumbnail: cache })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }

  async findXiaohongshuPoster(
    id: PRId,
    caption: string,
    posterStylePrompt: string,
  ): Promise<string | null> {
    const result = await db
      .select({ xiaohongshuPoster: partnerRequests.xiaohongshuPoster })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, id));
    const pr = result[0];
    if (!pr?.xiaohongshuPoster) return null;
    const cache = pr.xiaohongshuPoster;
    if (
      cache.caption === caption &&
      cache.posterStylePrompt === posterStylePrompt
    ) {
      return cache.posterUrl;
    }
    return null;
  }

  async findWechatThumbnail(id: PRId, style: number): Promise<string | null> {
    const result = await db
      .select({ wechatThumbnail: partnerRequests.wechatThumbnail })
      .from(partnerRequests)
      .where(eq(partnerRequests.id, id));
    const pr = result[0];
    if (!pr?.wechatThumbnail) return null;
    const cache = pr.wechatThumbnail;
    if (cache.style === style) {
      return cache.posterUrl;
    }
    return null;
  }

  async clearPosterCache(id: PRId): Promise<void> {
    await db
      .update(partnerRequests)
      .set({ xiaohongshuPoster: null, wechatThumbnail: null })
      .where(eq(partnerRequests.id, id));
  }
}
