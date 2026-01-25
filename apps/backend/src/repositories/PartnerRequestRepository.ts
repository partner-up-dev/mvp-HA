import { db } from '../lib/db';
import { partnerRequests, type NewPartnerRequest, type PRStatus } from '../entities/partner-request';
import { eq } from 'drizzle-orm';

export class PartnerRequestRepository {
  async create(data: NewPartnerRequest) {
    const result = await db.insert(partnerRequests).values(data).returning();
    return result[0];
  }

  async findById(id: string) {
    const result = await db.select().from(partnerRequests).where(eq(partnerRequests.id, id));
    return result[0] || null;
  }

  async updateStatus(id: string, status: PRStatus) {
    const result = await db
      .update(partnerRequests)
      .set({ status })
      .where(eq(partnerRequests.id, id))
      .returning();
    return result[0] || null;
  }
}
