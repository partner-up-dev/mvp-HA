import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../repositories/PartnerRepository";
import { UserRepository } from "../repositories/UserRepository";
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
import type { PartnerStatus } from "../entities/partner";
import type { UserId } from "../entities/user";

const repo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const partnerRequestAIService = new PartnerRequestAIService();

type PublicPR = Omit<PartnerRequest, "pinHash" | "title"> & {
  title?: string;
  partners: number[];
  myPartnerId: number | null;
};

export class PartnerRequestService {
  async createPRFromNaturalLanguage(
    rawText: string,
    pin: string,
    nowIso: string,
    nowWeekday: WeekdayLabel | null,
    creatorOpenId?: string | null,
  ) {
    if (!/^\d{4}$/.test(pin)) {
      throw new HTTPException(400, { message: "PIN must be exactly 4 digits" });
    }

    const fields = await partnerRequestAIService.parseRequest(
      rawText,
      nowIso,
      nowWeekday,
    );

    this.assertPartnerBoundsValid(fields.minPartners, fields.maxPartners, 0);

    const pinHash = await bcrypt.hash(pin, 10);
    const request = await repo.create({
      rawText,
      title: fields.title,
      type: fields.type,
      time: fields.time,
      location: fields.location,
      minPartners: fields.minPartners,
      maxPartners: fields.maxPartners,
      pinHash,
      budget: fields.budget,
      preferences: fields.preferences,
      notes: fields.notes,
      status: "OPEN",
    });

    const creatorUserId = creatorOpenId
      ? (await this.resolveUserByOpenId(creatorOpenId)).id
      : null;
    await this.initializeSlotsForPR(
      request.id,
      fields.minPartners,
      fields.maxPartners,
      creatorUserId,
      fields.time,
    );

    return { id: request.id };
  }

  async createPRFromStructured(
    fields: PartnerRequestFields,
    pin: string,
    status: CreatePRStructuredStatus,
    creatorOpenId?: string | null,
  ) {
    if (!/^\d{4}$/.test(pin)) {
      throw new HTTPException(400, { message: "PIN must be exactly 4 digits" });
    }

    this.assertPartnerBoundsValid(fields.minPartners, fields.maxPartners, 0);

    const pinHash = await bcrypt.hash(pin, 10);
    const request = await repo.create({
      rawText: this.buildStructuredFallbackRawText(fields),
      title: fields.title,
      type: fields.type,
      time: fields.time,
      location: fields.location,
      minPartners: fields.minPartners,
      maxPartners: fields.maxPartners,
      pinHash,
      budget: fields.budget,
      preferences: fields.preferences,
      notes: fields.notes,
      status,
    });

    const creatorUserId = creatorOpenId
      ? (await this.resolveUserByOpenId(creatorOpenId)).id
      : null;
    await this.initializeSlotsForPR(
      request.id,
      fields.minPartners,
      fields.maxPartners,
      creatorUserId,
      fields.time,
    );

    return { id: request.id };
  }

  async getPR(id: PRId, viewerOpenId?: string | null): Promise<PublicPR> {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }

    const refreshed = await this.refreshTemporalStatus(request);
    const viewerUserId = viewerOpenId
      ? (await this.resolveUserByOpenId(viewerOpenId)).id
      : null;

    return this.toPublicPR(refreshed, viewerUserId);
  }

  async getPRSummariesByIds(ids: PRId[]) {
    const uniqueIds = Array.from(new Set(ids));
    const rows = await repo.findByIds(uniqueIds);
    const refreshedRows = await Promise.all(
      rows.map((row) => this.refreshTemporalStatus(row)),
    );

    const summaries = await Promise.all(
      refreshedRows.map(async (row) => {
        const partners = await partnerRepo.listActiveIdsByPrId(row.id);
        return {
          id: row.id,
          status: this.toPublicStatus(row.status as string, row.time),
          minPartners: row.minPartners,
          maxPartners: row.maxPartners,
          partners,
          createdAt: row.createdAt.toISOString(),
          title: row.title ?? undefined,
          type: row.type,
        };
      }),
    );

    return summaries;
  }

  async updatePRStatus(id: PRId, status: PRStatusManual, pin: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }
    const refreshedRequest = await this.refreshTemporalStatus(request);

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

    return this.toPublicPR(updated, null);
  }

  async updatePRContent(id: PRId, fields: PartnerRequestFields, pin: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }
    const refreshedRequest = await this.refreshTemporalStatus(request);

    if (
      refreshedRequest.status !== "OPEN" &&
      refreshedRequest.status !== "DRAFT"
    ) {
      throw new HTTPException(400, {
        message:
          "Cannot edit - only OPEN or DRAFT partner requests can be edited",
      });
    }

    const isValid = await bcrypt.compare(pin, refreshedRequest.pinHash);
    if (!isValid) {
      throw new HTTPException(403, { message: "Invalid PIN" });
    }

    const minMaxChanged =
      refreshedRequest.minPartners !== fields.minPartners ||
      refreshedRequest.maxPartners !== fields.maxPartners;
    const currentParticipants = await partnerRepo.countActiveByPrId(id);
    this.assertPartnerBoundsValid(
      fields.minPartners,
      fields.maxPartners,
      currentParticipants,
    );

    const updated = await repo.updateFields(id, fields);
    if (!updated) {
      throw new HTTPException(500, { message: "Failed to update content" });
    }

    if (minMaxChanged) {
      await this.syncSlotCapacity(id, fields.minPartners, fields.maxPartners);
    }
    await repo.clearPosterCache(id);

    if (minMaxChanged && refreshedRequest.status !== "DRAFT") {
      await this.recalculatePRStatus(id);
    }

    const latest = await repo.findById(id);
    if (!latest) {
      throw new HTTPException(500, { message: "Failed to reload partner request" });
    }

    return this.toPublicPR(latest, null);
  }

  async joinPRAsAuthenticatedUser(id: PRId, openId: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }
    const refreshedRequest = await this.refreshTemporalStatus(request);

    if (this.isJoinLockedByTime(refreshedRequest.time)) {
      throw new HTTPException(400, {
        message: "Cannot join - event is locked after T-30min",
      });
    }

    if (!this.isJoinableStatus(refreshedRequest.status as string)) {
      throw new HTTPException(400, {
        message: "Cannot join - partner request is not open",
      });
    }

    const user = await this.resolveUserByOpenId(openId);
    if (user.status !== "ACTIVE") {
      throw new HTTPException(403, {
        message: "Current user is not active",
      });
    }

    const existing = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
    if (existing) {
      if (
        existing.status === "JOINED" &&
        this.shouldAutoConfirmImmediately(refreshedRequest.time)
      ) {
        await partnerRepo.markConfirmed(existing.id);
      }
      const latest = await repo.findById(id);
      if (!latest) {
        throw new HTTPException(500, { message: "Failed to reload partner request" });
      }
      return this.toPublicPR(latest, user.id);
    }

    const activeCount = await partnerRepo.countActiveByPrId(id);
    if (
      refreshedRequest.maxPartners !== null &&
      activeCount >= refreshedRequest.maxPartners
    ) {
      throw new HTTPException(400, {
        message: "Cannot join - partner request is full",
      });
    }

    const targetStatus: PartnerStatus = this.shouldAutoConfirmImmediately(
      refreshedRequest.time,
    )
      ? "CONFIRMED"
      : "JOINED";
    const released = await partnerRepo.findFirstReleasedSlot(id);
    if (released) {
      await partnerRepo.assignSlot(released.id, user.id, targetStatus);
    } else if (refreshedRequest.maxPartners === null) {
      await partnerRepo.createSlot({
        prId: id,
        userId: user.id,
        status: targetStatus,
      });
    } else {
      throw new HTTPException(400, {
        message: "Cannot join - partner request is full",
      });
    }

    await this.recalculatePRStatus(id);

    const latest = await repo.findById(id);
    if (!latest) {
      throw new HTTPException(500, { message: "Failed to reload partner request" });
    }
    return this.toPublicPR(latest, user.id);
  }

  async exitPRAsAuthenticatedUser(id: PRId, openId: string) {
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

    const user = await this.resolveUserByOpenId(openId);
    const activeSlot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
    if (!activeSlot) {
      throw new HTTPException(400, {
        message: "Cannot exit - partner is not joined",
      });
    }

    await partnerRepo.markReleased(activeSlot.id);
    await this.recalculatePRStatus(id);

    const latest = await repo.findById(id);
    if (!latest) {
      throw new HTTPException(500, { message: "Failed to reload partner request" });
    }
    return this.toPublicPR(latest, user.id);
  }

  async confirmPRSlot(id: PRId, openId: string) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }
    const refreshedRequest = await this.refreshTemporalStatus(request);

    const user = await this.resolveUserByOpenId(openId);
    const slot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
    if (!slot) {
      throw new HTTPException(400, {
        message: "Cannot confirm - partner is not joined",
      });
    }

    if (slot.status === "JOINED") {
      await partnerRepo.markConfirmed(slot.id);
    }

    const latest = await repo.findById(refreshedRequest.id);
    if (!latest) {
      throw new HTTPException(500, {
        message: "Failed to refresh partner request after confirm",
      });
    }
    return this.toPublicPR(latest, user.id);
  }

  async checkInPRSlot(
    id: PRId,
    openId: string,
    payload: {
      didAttend: boolean;
      wouldJoinAgain: boolean | null;
    },
  ) {
    const request = await repo.findById(id);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }
    const refreshedRequest = await this.refreshTemporalStatus(request);
    if (!this.hasEventStarted(refreshedRequest.time)) {
      throw new HTTPException(400, {
        message: "Cannot check in - event has not started",
      });
    }

    const user = await this.resolveUserByOpenId(openId);
    const slot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
    if (!slot) {
      throw new HTTPException(400, {
        message: "Cannot check in - partner is not joined",
      });
    }

    const updatedSlot = await partnerRepo.reportCheckIn(slot.id, payload);
    if (!updatedSlot) {
      throw new HTTPException(500, {
        message: "Failed to submit check-in",
      });
    }

    const latest = await repo.findById(id);
    if (!latest) {
      throw new HTTPException(500, {
        message: "Failed to refresh partner request after check-in",
      });
    }
    return this.toPublicPR(latest, user.id);
  }

  private async refreshTemporalStatus(
    request: PartnerRequest,
  ): Promise<PartnerRequest> {
    await this.releaseUnconfirmedSlotsIfNeeded(request);
    const afterRelease = await repo.findById(request.id);
    const normalized = afterRelease ?? request;
    const activated = await this.activateIfNeeded(normalized);
    return this.expireIfNeeded(activated);
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

  private async releaseUnconfirmedSlotsIfNeeded(
    request: PartnerRequest,
  ): Promise<void> {
    const confirmDeadline = this.getConfirmDeadline(request.time);
    if (!confirmDeadline) return;
    if (Date.now() < confirmDeadline.getTime()) return;

    const slots = await partnerRepo.findByPrId(request.id);
    const releasing = slots.filter((slot) => slot.status === "JOINED");
    if (releasing.length === 0) return;

    for (const slot of releasing) {
      await partnerRepo.markReleased(slot.id);
    }

    await this.recalculatePRStatus(request.id);
  }

  private async initializeSlotsForPR(
    prId: PRId,
    minPartners: number | null,
    maxPartners: number | null,
    creatorUserId: UserId | null,
    timeWindow: PartnerRequestFields["time"],
  ): Promise<void> {
    const desired = this.resolveDesiredSlotCount(minPartners, maxPartners);

    if (creatorUserId) {
      const creatorStatus: PartnerStatus =
        this.shouldAutoConfirmImmediately(timeWindow) ||
        this.isJoinLockedByTime(timeWindow)
          ? "CONFIRMED"
          : "JOINED";
      await partnerRepo.createSlot({
        prId,
        userId: creatorUserId,
        status: creatorStatus,
      });
      await partnerRepo.createReleasedSlots(prId, Math.max(0, desired - 1));
    } else {
      await partnerRepo.createReleasedSlots(prId, desired);
    }
  }

  private async syncSlotCapacity(
    prId: PRId,
    minPartners: number | null,
    maxPartners: number | null,
  ): Promise<void> {
    const desired = this.resolveDesiredSlotCount(minPartners, maxPartners);
    const slots = await partnerRepo.findByPrId(prId);
    const currentTotal = slots.length;

    if (currentTotal < desired) {
      await partnerRepo.createReleasedSlots(prId, desired - currentTotal);
      return;
    }

    if (currentTotal === desired) {
      return;
    }

    const toRemoveCount = currentTotal - desired;
    const removable = slots
      .filter((slot) => slot.status === "RELEASED")
      .sort((a, b) => b.id - a.id)
      .slice(0, toRemoveCount)
      .map((slot) => slot.id);

    if (removable.length < toRemoveCount) {
      throw new HTTPException(400, {
        message:
          "Invalid partner bounds - unable to shrink slots because active partners exceed target capacity",
      });
    }

    await partnerRepo.deleteByIds(removable);
  }

  private resolveDesiredSlotCount(
    minPartners: number | null,
    maxPartners: number | null,
  ): number {
    if (maxPartners !== null) return Math.max(1, maxPartners);
    if (minPartners !== null) return Math.max(1, minPartners);
    return 1;
  }

  private async recalculatePRStatus(prId: PRId): Promise<void> {
    const request = await repo.findById(prId);
    if (!request) {
      throw new HTTPException(404, { message: "Partner request not found" });
    }

    const activeCount = await partnerRepo.countActiveByPrId(prId);
    const nextStatus = this.deriveStatusFromPartnerCount(
      activeCount,
      request.minPartners,
      request.maxPartners,
    );
    if (
      this.shouldRecalculateCapacityStatus(request.status as string) &&
      request.status !== nextStatus
    ) {
      await repo.updateStatus(prId, nextStatus);
    }
  }

  private async toPublicPR(
    request: PartnerRequest,
    viewerUserId: UserId | null,
  ): Promise<PublicPR> {
    const partners = await partnerRepo.listActiveIdsByPrId(request.id);
    let myPartnerId: number | null = null;
    if (viewerUserId) {
      const slot = await partnerRepo.findActiveByPrIdAndUserId(
        request.id,
        viewerUserId,
      );
      myPartnerId = slot?.id ?? null;
    }

    const { pinHash, title, ...rest } = request;
    return {
      ...rest,
      title: title ?? undefined,
      partners,
      myPartnerId,
    };
  }

  private async resolveUserByOpenId(openId: string) {
    const trimmedOpenId = openId.trim();
    if (!trimmedOpenId) {
      throw new HTTPException(401, {
        message: "Invalid WeChat session",
      });
    }

    const existingUser = await userRepo.findByOpenId(trimmedOpenId);
    if (existingUser) {
      return existingUser;
    }

    const createdUser = await userRepo.createIfNotExists({
      id: this.generateUserId(),
      openId: trimmedOpenId,
      status: "ACTIVE",
    });
    if (createdUser) {
      return createdUser;
    }

    const racedUser = await userRepo.findByOpenId(trimmedOpenId);
    if (!racedUser) {
      throw new HTTPException(500, {
        message: "Failed to create user for WeChat session",
      });
    }

    return racedUser;
  }

  private generateUserId(): UserId {
    return `u_${randomUUID().replace(/-/g, "")}`;
  }

  private assertPartnerBoundsValid(
    minPartners: number | null,
    maxPartners: number | null,
    currentParticipants: number,
  ) {
    if (
      minPartners !== null &&
      maxPartners !== null &&
      minPartners > maxPartners
    ) {
      throw new HTTPException(400, {
        message: "Invalid partner bounds - minPartners cannot exceed maxPartners",
      });
    }

    if (maxPartners !== null && maxPartners < currentParticipants) {
      throw new HTTPException(400, {
        message:
          "Invalid partner bounds - maxPartners cannot be smaller than current participants",
      });
    }
  }

  private deriveStatusFromPartnerCount(
    partnerCount: number,
    minPartners: number | null,
    maxPartners: number | null,
  ): PRStatus {
    if (maxPartners !== null && partnerCount >= maxPartners) {
      return "FULL";
    }
    if (minPartners !== null && partnerCount >= minPartners) {
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

  private getConfirmDeadline(
    timeWindow: PartnerRequestFields["time"],
  ): Date | null {
    const start = this.getTimeWindowStart(timeWindow);
    if (!start) {
      return null;
    }
    return new Date(start.getTime() - 60 * 60 * 1000);
  }

  private getJoinLockTime(timeWindow: PartnerRequestFields["time"]): Date | null {
    const start = this.getTimeWindowStart(timeWindow);
    if (!start) {
      return null;
    }
    return new Date(start.getTime() - 30 * 60 * 1000);
  }

  private shouldAutoConfirmImmediately(
    timeWindow: PartnerRequestFields["time"],
  ): boolean {
    const confirmDeadline = this.getConfirmDeadline(timeWindow);
    const joinLockTime = this.getJoinLockTime(timeWindow);
    if (!confirmDeadline || !joinLockTime) {
      return false;
    }

    const now = Date.now();
    return now >= confirmDeadline.getTime() && now < joinLockTime.getTime();
  }

  private isJoinLockedByTime(timeWindow: PartnerRequestFields["time"]): boolean {
    const joinLockTime = this.getJoinLockTime(timeWindow);
    if (!joinLockTime) {
      return false;
    }

    return Date.now() >= joinLockTime.getTime();
  }

  private hasEventStarted(timeWindow: PartnerRequestFields["time"]): boolean {
    const start = this.getTimeWindowStart(timeWindow);
    if (!start) {
      return true;
    }
    return Date.now() >= start.getTime();
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
