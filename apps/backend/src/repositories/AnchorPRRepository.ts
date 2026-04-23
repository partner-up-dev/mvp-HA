import type { AnchorEvent, AnchorEventId, TimeWindowEntry } from "../entities/anchor-event";
import type {
  PRId,
  PRStatus,
  PartnerRequest,
  VisibilityStatus,
} from "../entities/partner-request";
import type { AnchorLocationSource } from "../entities/anchor-partner-request";
import { AnchorEventRepository } from "./AnchorEventRepository";
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
import { eventOwnsTimeWindow, listAnchorEventTimeWindows } from "../domains/anchor-event/services/time-window-pool";

export type AnchorPRContext = {
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

export type AnchorPRRecord = {
  root: PartnerRequest;
  anchor: AnchorPRContext;
};

const sortRecordsByCreatedAtDesc = (
  left: AnchorPRRecord,
  right: AnchorPRRecord,
): number => right.root.createdAt.getTime() - left.root.createdAt.getTime();

const dedupeRecordsByPrId = (records: AnchorPRRecord[]): AnchorPRRecord[] => {
  const byId = new Map<PRId, AnchorPRRecord>();
  for (const record of records) {
    if (!byId.has(record.root.id)) {
      byId.set(record.root.id, record);
    }
  }
  return Array.from(byId.values()).sort(sortRecordsByCreatedAtDesc);
};

const buildAnchorContext = (
  root: PartnerRequest,
  event: AnchorEvent,
): AnchorPRContext | null => {
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

export class AnchorPRRepository {
  private readonly prRootRepo = new PartnerRequestRepository();

  private readonly eventRepo = new AnchorEventRepository();

  private async buildRecordForRequest(
    root: PartnerRequest,
  ): Promise<AnchorPRRecord | null> {
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
  ): Promise<AnchorPRRecord[]> {
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

  async findByPrId(prId: PRId): Promise<AnchorPRContext | null> {
    const record = await this.findRecordByPrId(prId);
    return record?.anchor ?? null;
  }

  async findRecordByPrId(prId: PRId): Promise<AnchorPRRecord | null> {
    const root = await this.prRootRepo.findById(prId);
    if (!root) {
      return null;
    }

    return this.buildRecordForRequest(root);
  }

  async findVisibleByAnchorEventAndTimeWindow(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
  ): Promise<AnchorPRRecord[]> {
    return this.listRecordsByEventAndTimeWindow(anchorEventId, timeWindow, {
      visibleOnly: true,
    });
  }

  async findByAnchorEventAndTimeWindow(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
  ): Promise<AnchorPRRecord[]> {
    return this.listRecordsByEventAndTimeWindow(anchorEventId, timeWindow, {
      visibleOnly: false,
    });
  }

  async findVisibleByAnchorEventTimeWindowAndLocation(
    anchorEventId: AnchorEventId,
    timeWindow: TimeWindowEntry,
    location: string,
  ): Promise<AnchorPRRecord[]> {
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

  async findVisibleByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorPRRecord[]> {
    const event = await this.eventRepo.findById(anchorEventId);
    if (!event) {
      return [];
    }

    const nested = await Promise.all(
      listAnchorEventTimeWindows(event).map((timeWindow) =>
        this.findVisibleByAnchorEventAndTimeWindow(anchorEventId, timeWindow),
      ),
    );
    return dedupeRecordsByPrId(nested.flat());
  }

  async findByAnchorEventId(anchorEventId: AnchorEventId): Promise<AnchorPRRecord[]> {
    const event = await this.eventRepo.findById(anchorEventId);
    if (!event) {
      return [];
    }

    const nested = await Promise.all(
      listAnchorEventTimeWindows(event).map((timeWindow) =>
        this.findByAnchorEventAndTimeWindow(anchorEventId, timeWindow),
      ),
    );
    return dedupeRecordsByPrId(nested.flat());
  }

  async findByRootStatuses(statuses: PRStatus[]): Promise<AnchorPRRecord[]> {
    if (statuses.length === 0) {
      return [];
    }

    const roots = await this.prRootRepo.findByStatuses(statuses);
    const records = await Promise.all(
      roots.map((root) => this.buildRecordForRequest(root)),
    );
    return dedupeRecordsByPrId(
      records.filter((record): record is AnchorPRRecord => record !== null),
    );
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
  ): Promise<AnchorPRContext | null> {
    const updated = await this.prRootRepo.updatePartnerRules(prId, data);
    if (!updated) {
      return null;
    }
    return this.findByPrId(prId);
  }

  async updateLocationSource(
    prId: PRId,
    _locationSource: AnchorLocationSource,
  ): Promise<AnchorPRContext | null> {
    return this.findByPrId(prId);
  }

  async updateBookingTriggeredAt(
    prId: PRId,
    _bookingTriggeredAt: Date | null,
  ): Promise<AnchorPRContext | null> {
    return this.findByPrId(prId);
  }
}
