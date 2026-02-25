import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import { PartnerRequestAIService } from "./PartnerRequestAIService";
import type {
  PartnerRequest,
  PRStatus,
  PRStatusManual,
  CreatePRStructuredStatus,
  PartnerRequestFields,
  PRId,
  WeekdayLabel,
} from "../entities/partner-request";

const repo = new PartnerRequestRepository();
const partnerRequestAIService = new PartnerRequestAIService();

export class PartnerRequestService {
  async createPRFromNaturalLanguage(
    rawText: string,
    pin: string,
    nowIso: string,
    nowWeekday: WeekdayLabel | null,
  ) {
    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      throw new HTTPException(400, { message: "PIN must be exactly 4 digits" });
    }

    // Parse with LLM
    const fields = await partnerRequestAIService.parseRequest(
      rawText,
      nowIso,
      nowWeekday,
    );
    const partners: PartnerRequestFields["partners"] = [
      fields.partners[0],
      1,
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
      1,
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

    const refreshed = await this.refreshTemporalStatus(request);
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
      status: this.toPublicStatus(row.status as string, row.time),
      partners: row.partners,
      createdAt: row.createdAt.toISOString(),
      title: row.title ?? undefined,
      type: row.type,
    }));
  }

  async updatePRStatus(id: PRId, status: PRStatusManual, pin: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }
    const refreshedRequest = await this.refreshTemporalStatus(request);

    // Verify PIN
    const isValid = await bcrypt.compare(pin, refreshedRequest.pinHash);
    if (!isValid) {
      throw new HTTPException(403, { message: "Invalid PIN" });
    }

    const currentStatus = refreshedRequest.status as string;
    if (
      status === "ACTIVE" &&
      currentStatus !== "ACTIVE" &&
      !this.isActivatableStatus(currentStatus)
    ) {
      throw new HTTPException(400, {
        message: "Cannot set ACTIVE - only READY or FULL can become ACTIVE",
      });
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
    const refreshedRequest = await this.refreshTemporalStatus(request);

    // Check status is editable
    if (
      refreshedRequest.status !== "OPEN" &&
      refreshedRequest.status !== "READY" &&
      refreshedRequest.status !== "DRAFT"
    ) {
      throw new HTTPException(400, {
        message:
          "Cannot edit - only OPEN, READY or DRAFT partner requests can be edited",
      });
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, refreshedRequest.pinHash);
    if (!isValid) {
      throw new HTTPException(403, { message: "Invalid PIN" });
    }

    const normalizedPartners: PartnerRequestFields["partners"] = [
      fields.partners[0],
      refreshedRequest.partners[1],
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
    const refreshedRequest = await this.refreshTemporalStatus(request);

    if (!this.isJoinableStatus(refreshedRequest.status as string)) {
      throw new HTTPException(400, {
        message: "Cannot join - partner request is not open",
      });
    }

    // Check if already full (if max partners is specified)
    const [minPartners, currentPartners, maxPartners] = refreshedRequest.partners;
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

    const nextStatus = this.deriveStatusFromPartners(updated.partners);
    if (
      this.shouldRecalculateCapacityStatus(updated.status as string) &&
      updated.status !== nextStatus
    ) {
      const statusUpdated = await repo.updateStatus(id, nextStatus);
      if (!statusUpdated) {
        throw new HTTPException(500, {
          message: "Failed to update partner request status",
        });
      }
      const { pinHash, ...publicData } = statusUpdated;
      return publicData;
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }

  async exitPR(id: PRId) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }
    const refreshedRequest = await this.refreshTemporalStatus(request);

    if (!this.isExitAllowedStatus(refreshedRequest.status as string)) {
      throw new HTTPException(400, {
        message: "Cannot exit - partner request is not open",
      });
    }

    // Check if there are partners to exit
    if (refreshedRequest.partners[1] <= 1) {
      throw new HTTPException(400, { message: "No joined partners to exit" });
    }

    const [minPartners, currentPartners, maxPartners] = refreshedRequest.partners;
    const updated = await repo.updatePartners(id, [
      minPartners,
      Math.max(1, currentPartners - 1),
      maxPartners,
    ]);
    if (!updated) {
      throw new HTTPException(500, {
        message: "Failed to exit partner request",
      });
    }

    const nextStatus = this.deriveStatusFromPartners(updated.partners);
    if (
      this.shouldRecalculateCapacityStatus(updated.status as string) &&
      updated.status !== nextStatus
    ) {
      const statusUpdated = await repo.updateStatus(id, nextStatus);
      if (!statusUpdated) {
        throw new HTTPException(500, {
          message: "Failed to update partner request status",
        });
      }
      const { pinHash, ...publicData } = statusUpdated;
      return publicData;
    }

    const { pinHash, ...publicData } = updated;
    return publicData;
  }

  private async expireIfNeeded(
    request: PartnerRequest,
  ): Promise<PartnerRequest> {
    if (!this.isExpirableStatus(request.status as string)) {
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

  private async activateIfNeeded(
    request: PartnerRequest,
  ): Promise<PartnerRequest> {
    if (!this.isActivatableStatus(request.status as string)) {
      return request;
    }

    const windowStart = this.getTimeWindowStart(request.time);
    if (!windowStart) {
      return request;
    }

    const now = Date.now();
    if (windowStart.getTime() > now) {
      return request;
    }

    const windowClose = this.getTimeWindowClose(request.time);
    if (windowClose && windowClose.getTime() <= now) {
      return request;
    }

    const updated = await repo.updateStatus(request.id, "ACTIVE");
    return updated ?? request;
  }

  private async refreshTemporalStatus(
    request: PartnerRequest,
  ): Promise<PartnerRequest> {
    const activated = await this.activateIfNeeded(request);
    return this.expireIfNeeded(activated);
  }

  private deriveStatusFromPartners(
    partners: PartnerRequestFields["partners"],
  ): PRStatus {
    const [minPartners, currentPartners, maxPartners] = partners;
    if (maxPartners !== null && currentPartners >= maxPartners) {
      return "FULL";
    }
    if (minPartners !== null && currentPartners >= minPartners) {
      return "READY";
    }
    return "OPEN";
  }

  private isJoinableStatus(status: string): boolean {
    return status === "OPEN" || status === "READY";
  }

  private isExitAllowedStatus(status: string): boolean {
    return (
      status === "OPEN" ||
      status === "READY" ||
      status === "FULL" ||
      status === "ACTIVE"
    );
  }

  private shouldRecalculateCapacityStatus(status: string): boolean {
    return status === "OPEN" || status === "READY" || status === "FULL";
  }

  private isActivatableStatus(status: string): boolean {
    return status === "READY" || status === "FULL";
  }

  private isExpirableStatus(status: string): boolean {
    return (
      status === "OPEN" ||
      status === "READY" ||
      status === "FULL" ||
      status === "ACTIVE"
    );
  }

  private toPublicStatus(
    rawStatus: string,
    timeWindow: PartnerRequestFields["time"],
  ): PRStatus {
    if (
      (rawStatus === "READY" || rawStatus === "FULL") &&
      this.isWithinActiveWindow(timeWindow)
    ) {
      return "ACTIVE";
    }

    if (
      rawStatus === "DRAFT" ||
      rawStatus === "OPEN" ||
      rawStatus === "READY" ||
      rawStatus === "FULL" ||
      rawStatus === "ACTIVE" ||
      rawStatus === "CLOSED" ||
      rawStatus === "EXPIRED"
    ) {
      return rawStatus;
    }

    return "OPEN";
  }

  private isWithinActiveWindow(
    timeWindow: PartnerRequestFields["time"],
  ): boolean {
    const start = this.getTimeWindowStart(timeWindow);
    if (!start) return false;

    const now = Date.now();
    if (start.getTime() > now) return false;

    const close = this.getTimeWindowClose(timeWindow);
    if (close && close.getTime() <= now) return false;

    return true;
  }

  private getTimeWindowStart(
    timeWindow: PartnerRequestFields["time"],
  ): Date | null {
    const [startRaw] = timeWindow;
    return this.parseTimeWindowDate(startRaw);
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
