import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import { LLMService } from "./LLMService";
import type {
  PartnerRequest,
  PRStatus,
  CreatePRStructuredStatus,
  PartnerRequestFields,
  PRId,
} from "../entities/partner-request";

const repo = new PartnerRequestRepository();
const llmService = new LLMService();

export class PartnerRequestService {
  async createPRFromNaturalLanguage(
    rawText: string,
    pin: string,
    nowIso: string,
  ) {
    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      throw new HTTPException(400, { message: "PIN must be exactly 4 digits" });
    }

    // Parse with LLM
    const fields = await llmService.parseRequest(rawText, nowIso);
    const partners: PartnerRequestFields["partners"] = [
      fields.partners[0],
      0,
      fields.partners[2],
    ];

    // Hash the PIN
    const pinHash = await bcrypt.hash(pin, 10);

    // Create record
    const request = await repo.create({
      rawText,
      title: fields.title,
      type: fields.type,
      time: fields.time,
      location: fields.location,
      pinHash,
      partners,
      budget: fields.budget,
      preferences: fields.preferences,
      notes: fields.notes,
      status: "OPEN",
    });

    return { id: request.id };
  }

  async createPRFromStructured(
    fields: PartnerRequestFields,
    pin: string,
    status: CreatePRStructuredStatus,
  ) {
    if (!/^\d{4}$/.test(pin)) {
      throw new HTTPException(400, { message: "PIN must be exactly 4 digits" });
    }

    const partners: PartnerRequestFields["partners"] = [
      fields.partners[0],
      0,
      fields.partners[2],
    ];
    const pinHash = await bcrypt.hash(pin, 10);
    const request = await repo.create({
      rawText: this.buildStructuredFallbackRawText(fields),
      title: fields.title,
      type: fields.type,
      time: fields.time,
      location: fields.location,
      pinHash,
      partners,
      budget: fields.budget,
      preferences: fields.preferences,
      notes: fields.notes,
      status,
    });

    return { id: request.id };
  }

  async getPR(id: PRId) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }

    const refreshed = await this.expireIfNeeded(request);
    const { pinHash, title, ...rest } = refreshed;
    return {
      ...rest,
      title: title ?? undefined,
    };
  }

  async getPRSummariesByIds(ids: PRId[]) {
    const uniqueIds = Array.from(new Set(ids));
    const rows = await repo.findByIds(uniqueIds);

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      partners: row.partners,
      createdAt: row.createdAt.toISOString(),
      title: row.title ?? undefined,
      type: row.type,
    }));
  }

  async updatePRStatus(id: PRId, status: PRStatus, pin: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, request.pinHash);
    if (!isValid) {
      throw new HTTPException(403, { message: "Invalid PIN" });
    }

    const updated = await repo.updateStatus(id, status);
    if (!updated) {
      throw new HTTPException(500, { message: "Failed to update status" });
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }

  async updatePRContent(id: PRId, fields: PartnerRequestFields, pin: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }

    // Check status is editable
    if (request.status !== "OPEN" && request.status !== "DRAFT") {
      throw new HTTPException(400, {
        message:
          "Cannot edit - only OPEN or DRAFT partner requests can be edited",
      });
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, request.pinHash);
    if (!isValid) {
      throw new HTTPException(403, { message: "Invalid PIN" });
    }

    const normalizedPartners: PartnerRequestFields["partners"] = [
      fields.partners[0],
      request.partners[1],
      fields.partners[2],
    ];

    const updated = await repo.updateFields(id, {
      ...fields,
      partners: normalizedPartners,
    });
    if (!updated) {
      throw new HTTPException(500, { message: "Failed to update content" });
    }

    // Clear poster cache when content changes
    await repo.clearPosterCache(id);

    const { pinHash, ...publicData } = updated;
    return publicData;
  }

  async joinPR(id: PRId) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }

    // Check if status is OPEN or ACTIVE
    if (request.status !== "OPEN" && request.status !== "ACTIVE") {
      throw new HTTPException(400, {
        message: "Cannot join - partner request is not open",
      });
    }

    // Check if already full (if max partners is specified)
    const [minPartners, currentPartners, maxPartners] = request.partners;
    if (maxPartners !== null && currentPartners >= maxPartners) {
      throw new HTTPException(400, {
        message: "Cannot join - partner request is full",
      });
    }

    const updated = await repo.updatePartners(id, [
      minPartners,
      currentPartners + 1,
      maxPartners,
    ]);
    if (!updated) {
      throw new HTTPException(500, {
        message: "Failed to join partner request",
      });
    }

    const newParticipants = updated.partners[1];

    // If min partners is reached and status is OPEN, change to ACTIVE
    if (
      minPartners !== null &&
      newParticipants >= minPartners &&
      updated.status === "OPEN"
    ) {
      const statusUpdated = await repo.updateStatus(id, "ACTIVE");
      if (statusUpdated) {
        const { pinHash, ...publicData } = statusUpdated;
        return publicData;
      }
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }

  async exitPR(id: PRId) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }

    // Check if there are partners to exit
    if (request.partners[1] <= 0) {
      throw new HTTPException(400, { message: "No partners to exit" });
    }

    const [minPartners, currentPartners, maxPartners] = request.partners;
    const updated = await repo.updatePartners(id, [
      minPartners,
      Math.max(0, currentPartners - 1),
      maxPartners,
    ]);
    if (!updated) {
      throw new HTTPException(500, {
        message: "Failed to exit partner request",
      });
    }

    const newParticipants = updated.partners[1];

    // If partners drop below min partners and status is ACTIVE, change back to OPEN
    if (
      minPartners !== null &&
      newParticipants < minPartners &&
      updated.status === "ACTIVE"
    ) {
      const statusUpdated = await repo.updateStatus(id, "OPEN");
      if (statusUpdated) {
        const { pinHash, ...publicData } = statusUpdated;
        return publicData;
      }
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }

  private async expireIfNeeded(
    request: PartnerRequest,
  ): Promise<PartnerRequest> {
    if (request.status !== "OPEN" && request.status !== "ACTIVE") {
      return request;
    }

    const windowClose = this.getTimeWindowClose(request.time);
    if (!windowClose) {
      return request;
    }

    if (windowClose.getTime() > Date.now()) {
      return request;
    }

    const updated = await repo.updateStatus(request.id, "EXPIRED");
    return updated ?? request;
  }

  private getTimeWindowClose(
    timeWindow: PartnerRequestFields["time"],
  ): Date | null {
    const [startRaw, endRaw] = timeWindow;
    const end = this.parseTimeWindowDate(endRaw);
    if (end) return end;

    const start = this.parseTimeWindowDate(startRaw);
    if (!start) return null;

    return new Date(start.getTime() + 12 * 60 * 60 * 1000);
  }

  private parseTimeWindowDate(value: string | null): Date | null {
    if (!value) return null;

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const normalized = isDateOnly ? `${value}T00:00:00` : value;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private buildStructuredFallbackRawText(fields: PartnerRequestFields): string {
    const parts: string[] = [];
    if (fields.title?.trim()) parts.push(fields.title.trim());
    parts.push(`类型:${fields.type}`);
    if (fields.location?.trim()) parts.push(`地点:${fields.location.trim()}`);
    const [start, end] = fields.time;
    if (start || end) parts.push(`时间:${start ?? "待定"}-${end ?? "待定"}`);
    return parts.join(" | ");
  }
}
