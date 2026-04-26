import type { AnchorEvent, AnchorEventId, TimeWindowEntry } from "../entities/anchor-event";
import type {
  PRId,
  PRStatus,
  PartnerRequest,
  VisibilityStatus,
} from "../entities/partner-request";
import type { AnchorLocationSource } from "../entities/anchor-partner-request";
import { AnchorEventRepository } from "./AnchorEventRepository";
import { AnchorEventPRAttachmentRepository } from "./AnchorEventPRAttachmentRepository";
import { PartnerRequestRepository } from "./PartnerRequestRepository";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../domains/pr/services";
import {
  isEventScopedLocation,
  resolveEventLocationSource,
} from "../domains/anchor-event/services/event-scope";
import { eventOwnsTimeWindow } from "../domains/anchor-event/services/time-window-pool";

export type AnchorEventPRContext = {
  prId: PRId;
  anchorEventId: AnchorEventId;
  timeWindow: TimeWindowEntry;
  locationSource: AnchorLocationSource;
  visibilityStatus: VisibilityStatus;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  bookingTriggeredAt: Date | null;
  autoHideAt: Date | null;
};

export type AnchorEventPRContextRecord = {
  root: PartnerRequest;
  anchor: AnchorEventPRContext;
};

const sortRecordsByCreatedAtDesc = (
  left: AnchorEventPRContextRecord,
  right: AnchorEventPRContextRecord,
): number => right.root.createdAt.getTime() - left.root.createdAt.getTime();

const buildAnchorContext = (
  root: PartnerRequest,
  event: AnchorEvent,
): AnchorEventPRContext | null => {
  const locationSource = resolveEventLocationSource(event, root.location);
  if (!locationSource) {
    return null;
  }

  return {
    prId: root.id,
    anchorEventId: event.id,
    timeWindow: root.time,
    locationSource,
    visibilityStatus: root.visibilityStatus,
    confirmationStartOffsetMinutes:
      root.confirmationStartOffsetMinutes ??
      DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    confirmationEndOffsetMinutes:
      root.confirmationEndOffsetMinutes ??
      DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    joinLockOffsetMinutes:
      root.joinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    bookingTriggeredAt: null,
    autoHideAt: null,
  };
};

const isRecordVisible = (root: PartnerRequest): boolean =>
  root.visibilityStatus === "VISIBLE";

export class AnchorEventPRContextRepository {
  private readonly prRootRepo = new PartnerRequestRepository();

  private readonly eventRepo = new AnchorEventRepository();

  private readonly attachmentRepo = new AnchorEventPRAttachmentRepository();

  private async buildRecordForRequest(
    root: PartnerRequest,
  ): Promise<AnchorEventPRContextRecord | null> {
    const attachment = await this.attachmentRepo.findByPrId(root.id);
    if (attachment) {
      const attachedEvent = await this.eventRepo.findById(attachment.anchorEventId);
      if (attachedEvent && isEventScopedLocation(attachedEvent, root.location)) {
        const anchor = buildAnchorContext(root, attachedEvent);
        if (anchor) {
          return { root, anchor };
        }
      }
    }

    const candidateEvents = await this.eventRepo.findByType(root.type);

    for (const event of candidateEvents) {
      if (!isEventScopedLocation(event, root.location)) {
        continue;
      }
      if (!eventOwnsTimeWindow(event, root.time)) {
        continue;
      }

      const anchor = buildAnchorContext(root, event);
      if (!anchor) {
        continue;
      }

      return { root, anchor };
    }

    return null;
  }

  private async listRecordsByEventAndTimeWindow(
    eventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
    options: { visibleOnly: boolean; location?: string } = { visibleOnly: true },
  ): Promise<AnchorEventPRContextRecord[]> {
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      return [];
    }
    if (!eventOwnsTimeWindow(event, timeWindow)) {
      return [];
    }

    const roots = await this.prRootRepo.findByTypeAndTime(event.type, timeWindow);

    const records = roots.flatMap((root) => {
      if (!isEventScopedLocation(event, root.location)) {
        return [];
      }
      if (options.visibleOnly && !isRecordVisible(root)) {
        return [];
      }
      if (
        options.location !== undefined &&
        (root.location?.trim() ?? "") !== options.location
      ) {
        return [];
      }

      const anchor = buildAnchorContext(root, event);
      return anchor ? [{ root, anchor }] : [];
    });

    return records.sort(sortRecordsByCreatedAtDesc);
  }

  async findByPrId(prId: PRId): Promise<AnchorEventPRContext | null> {
    const record = await this.findRecordByPrId(prId);
    return record?.anchor ?? null;
  }

  async findRecordByPrId(prId: PRId): Promise<AnchorEventPRContextRecord | null> {
    const root = await this.prRootRepo.findById(prId);
    if (!root) {
      return null;
    }

    return this.buildRecordForRequest(root);
  }

  async findVisibleByAnchorEventAndTimeWindow(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
  ): Promise<AnchorEventPRContextRecord[]> {
    return this.listRecordsByEventAndTimeWindow(anchorEventId, timeWindow, {
      visibleOnly: true,
    });
  }

  async findByAnchorEventAndTimeWindow(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
  ): Promise<AnchorEventPRContextRecord[]> {
    return this.listRecordsByEventAndTimeWindow(anchorEventId, timeWindow, {
      visibleOnly: false,
    });
  }

  async findVisibleByAnchorEventTimeWindowAndLocation(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
    location: string,
  ): Promise<AnchorEventPRContextRecord[]> {
    return this.listRecordsByEventAndTimeWindow(anchorEventId, timeWindow, {
      visibleOnly: true,
      location,
    });
  }

  async countActiveVisibleByEventTimeWindowAndLocationSource(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
    location: string,
    locationSource: AnchorLocationSource,
  ): Promise<number> {
    const records = await this.findVisibleByAnchorEventTimeWindowAndLocation(
      anchorEventId,
      timeWindow,
      location,
    );
    return records.filter((record) => {
      if (record.anchor.locationSource !== locationSource) {
        return false;
      }
      return record.root.status !== "CLOSED" && record.root.status !== "EXPIRED";
    }).length;
  }

  async findByRootStatuses(statuses: PRStatus[]): Promise<AnchorEventPRContextRecord[]> {
    if (statuses.length === 0) {
      return [];
    }

    const roots = await this.prRootRepo.findByStatuses(statuses);
    const records = await Promise.all(
      roots.map((root) => this.buildRecordForRequest(root)),
    );
    const byId = new Map<PRId, AnchorEventPRContextRecord>();
    for (const record of records) {
      if (!record) {
        continue;
      }
      if (!byId.has(record.root.id)) {
        byId.set(record.root.id, record);
      }
    }
    return Array.from(byId.values()).sort(sortRecordsByCreatedAtDesc);
  }

  async findVisibleByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorEventPRContextRecord[]> {
    const event = await this.eventRepo.findById(anchorEventId);
    if (!event) {
      return [];
    }

    const roots = await this.prRootRepo.findVisibleByType(event.type);
    const records = await Promise.all(
      roots.map((root) => this.buildRecordForRequest(root)),
    );

    return records
      .filter(
        (record): record is AnchorEventPRContextRecord =>
          record !== null && record.anchor.anchorEventId === anchorEventId,
      )
      .sort(sortRecordsByCreatedAtDesc);
  }

  async updateVisibilityStatus(
    prId: PRId,
    visibilityStatus: VisibilityStatus,
  ): Promise<void> {
    await this.prRootRepo.updateVisibilityStatus(prId, visibilityStatus);
  }

  async updateParticipationPolicy(
    prId: PRId,
    data: {
      confirmationStartOffsetMinutes: number | null;
      confirmationEndOffsetMinutes: number | null;
      joinLockOffsetMinutes: number | null;
    },
  ): Promise<AnchorEventPRContext | null> {
    const updated = await this.prRootRepo.updatePartnerRules(prId, data);
    if (!updated) {
      return null;
    }
    return this.findByPrId(prId);
  }

  async updateLocationSource(
    prId: PRId,
    _locationSource: AnchorLocationSource,
  ): Promise<AnchorEventPRContext | null> {
    return this.findByPrId(prId);
  }

  async updateBookingTriggeredAt(
    prId: PRId,
    _bookingTriggeredAt: Date | null,
  ): Promise<AnchorEventPRContext | null> {
    return this.findByPrId(prId);
  }
}
