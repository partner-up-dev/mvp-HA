import bcrypt from 'bcryptjs';
import { HTTPException } from 'hono/http-exception';
import { PartnerRequestRepository } from '../repositories/PartnerRequestRepository';
import { LLMService } from './LLMService';
import type { PRStatus, ParsedPartnerRequest } from '../entities/partner-request';

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

  async updatePRContent(id: string, parsed: ParsedPartnerRequest, pin: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: 'Partner request not found' });
    }

    // Check status is OPEN
    if (request.status !== 'OPEN') {
      throw new HTTPException(400, { message: 'Cannot edit - only OPEN partner requests can be edited' });
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, request.pinHash);
    if (!isValid) {
      throw new HTTPException(403, { message: 'Invalid PIN' });
    }

    const updated = await repo.updateParsed(id, parsed);
    if (!updated) {
      throw new HTTPException(500, { message: 'Failed to update content' });
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }

  async joinPR(id: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: 'Partner request not found' });
    }

    // Check if status is OPEN or ACTIVE
    if (request.status !== 'OPEN' && request.status !== 'ACTIVE') {
      throw new HTTPException(400, { message: 'Cannot join - partner request is not open' });
    }

    // Check if already full (if maxParticipants is specified)
    if (request.parsed.maxParticipants) {
      const currentCount = request.participants || 0;
      if (currentCount >= request.parsed.maxParticipants) {
        throw new HTTPException(400, { message: 'Cannot join - partner request is full' });
      }
    }

    const updated = await repo.incrementParticipants(id);
    if (!updated) {
      throw new HTTPException(500, { message: 'Failed to join partner request' });
    }

    // Check if we should change status to ACTIVE
    const newParticipants = updated.participants || 0;

    // If minParticipants is reached and status is OPEN, change to ACTIVE
    if (request.parsed.minParticipants && newParticipants >= request.parsed.minParticipants && updated.status === 'OPEN') {
      const statusUpdated = await repo.updateStatus(id, 'ACTIVE');
      if (statusUpdated) {
        const { pinHash, ...publicData } = statusUpdated;
        return publicData;
      }
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }

  async exitPR(id: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: 'Partner request not found' });
    }

    // Check if there are participants to exit
    if (!request.participants || request.participants <= 0) {
      throw new HTTPException(400, { message: 'No participants to exit' });
    }

    const updated = await repo.decrementParticipants(id);
    if (!updated) {
      throw new HTTPException(500, { message: 'Failed to exit partner request' });
    }

    // Check if we should change status back to OPEN
    const newParticipants = updated.participants || 0;

    // If participants drop below minParticipants and status is ACTIVE, change back to OPEN
    if (request.parsed.minParticipants && newParticipants < request.parsed.minParticipants && updated.status === 'ACTIVE') {
      const statusUpdated = await repo.updateStatus(id, 'OPEN');
      if (statusUpdated) {
        const { pinHash, ...publicData } = statusUpdated;
        return publicData;
      }
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }
}
