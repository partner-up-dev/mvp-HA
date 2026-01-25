import bcrypt from 'bcryptjs';
import { HTTPException } from 'hono/http-exception';
import { PartnerRequestRepository } from '../repositories/PartnerRequestRepository';
import { LLMService } from './LLMService';
import type { PRStatus } from '../entities/partner-request';

const repo = new PartnerRequestRepository();
const llmService = new LLMService();

export class PartnerRequestService {
  async createPR(rawText: string, pin: string) {
    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      throw new HTTPException(400, { message: 'PIN must be exactly 4 digits' });
    }

    // Parse with LLM
    const parsed = await llmService.parseRequest(rawText);

    // Hash the PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Create record
    const request = await repo.create({
      rawText,
      parsed,
      pinHash,
      status: 'OPEN',
    });

    return { id: request.id };
  }

  async getPR(id: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: 'Partner request not found' });
    }

    // Return without pinHash for security
    const { pinHash, ...publicData } = request;
    return publicData;
  }

  async updatePRStatus(id: string, status: PRStatus, pin: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: 'Partner request not found' });
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, request.pinHash);
    if (!isValid) {
      throw new HTTPException(403, { message: 'Invalid PIN' });
    }

    const updated = await repo.updateStatus(id, status);
    if (!updated) {
      throw new HTTPException(500, { message: 'Failed to update status' });
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }
}
