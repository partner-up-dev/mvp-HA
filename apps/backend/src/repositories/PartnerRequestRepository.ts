import { db } from '../lib/db';
import { partnerRequests, type NewPartnerRequest, type PRStatus, type ParsedPartnerRequest, type PRId } from '../entities/partner-request';
import { eq } from 'drizzle-orm';

export class PartnerRequestRepository {
  async create(data: NewPartnerRequest) {
    const result = await db.insert(partnerRequests).values(data).returning();
    return result[0];
  }

  async findById(id: PRId) {
    const result = await db.select().from(partnerRequests).where(eq(partnerRequests.id, id));
    return result[0] || null;
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
}
