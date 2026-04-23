import type { AnchorEvent, AnchorEventId } from "../entities/anchor-event";
import type {
  AnchorEventBatch,
  AnchorEventBatchId,
} from "../entities/anchor-event-batch";
import type {
  PRId,
  PRStatus,
  PartnerRequest,
  VisibilityStatus,
} from "../entities/partner-request";
import type { AnchorLocationSource } from "../entities/anchor-partner-request";
import { AnchorEventBatchRepository } from "./AnchorEventBatchRepository";
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

export type AnchorPRContext = {
  prId: PRId;
  anchorEventId: AnchorEventId;
  batchId: AnchorEventBatchId;
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
  batch: AnchorEventBatch,
): AnchorPRContext | null => {
  const locationSource = resolveEventLocationSource(event, root.location);
  if (!locationSource) {
    return null;
  }

  return {
    prId: root.id,
    anchorEventId: event.id,
    batchId: batch.id,
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

  private readonly batchRepo = new AnchorEventBatchRepository();

  private readonly eventRepo = new AnchorEventRepository();

  private async resolveEventBatch(
    batchId: AnchorEventBatchId,
  ): Promise<{ event: AnchorEvent; batch: AnchorEventBatch } | null> {
    const batch = await this.batchRepo.findById(batchId);
    if (!batch) {
      return null;
    }

    const event = await this.eventRepo.findById(batch.anchorEventId);
    if (!event) {
      return null;
    }

    return { event, batch };
  }

  private async buildRecordForRequest(
    root: PartnerRequest,
  ): Promise<AnchorPRRecord | null> {
    const candidateBatches = await this.batchRepo.findByTimeWindow(root.time);
    if (candidateBatches.length === 0) {
      return null;
    }

    const eventCache = new Map<AnchorEventId, AnchorEvent | null>();
    for (const batch of candidateBatches) {
      let event = eventCache.get(batch.anchorEventId);
      if (event === undefined) {
        event = await this.eventRepo.findById(batch.anchorEventId);
        eventCache.set(batch.anchorEventId, event);
      }
      if (!event) {
        continue;
      }
      if (event.type !== root.type) {
        continue;
      }
      if (!isEventScopedLocation(event, root.location)) {
        continue;
      }

      const anchor = buildAnchorContext(root, event, batch);
      if (!anchor) {
        continue;
      }

      return { root, anchor };
    }

    return null;
  }

  private async listRecordsByBatchId(
    batchId: AnchorEventBatchId,
    options: { visibleOnly: boolean; location?: string } = { visibleOnly: true },
  ): Promise<AnchorPRRecord[]> {
    const resolved = await this.resolveEventBatch(batchId);
    if (!resolved) {
      return [];
    }

    const { event, batch } = resolved;
    const roots = await this.prRootRepo.findByTypeAndTime(event.type, batch.timeWindow);

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

      const anchor = buildAnchorContext(root, event, batch);
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

  async findVisibleByBatchId(
    batchId: AnchorEventBatchId,
  ): Promise<AnchorPRRecord[]> {
    return this.listRecordsByBatchId(batchId, { visibleOnly: true });
  }

  async findByBatchId(batchId: AnchorEventBatchId): Promise<AnchorPRRecord[]> {
    return this.listRecordsByBatchId(batchId, { visibleOnly: false });
  }

  async findVisibleByBatchIdAndLocation(
    batchId: AnchorEventBatchId,
    location: string,
  ): Promise<AnchorPRRecord[]> {
    return this.listRecordsByBatchId(batchId, {
      visibleOnly: true,
      location,
    });
  }

  async countActiveVisibleByBatchAndLocationSource(
    batchId: AnchorEventBatchId,
    location: string,
    locationSource: AnchorLocationSource,
  ): Promise<number> {
    const records = await this.findVisibleByBatchIdAndLocation(batchId, location);
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
    const batches = await this.batchRepo.findByAnchorEventId(anchorEventId);
    const nested = await Promise.all(
      batches.map((batch) => this.findVisibleByBatchId(batch.id)),
    );
    return dedupeRecordsByPrId(nested.flat());
  }

  async findByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorPRRecord[]> {
    const batches = await this.batchRepo.findByAnchorEventId(anchorEventId);
    const nested = await Promise.all(batches.map((batch) => this.findByBatchId(batch.id)));
    return dedupeRecordsByPrId(nested.flat());
  }

  async findByRootStatuses(statuses: PRStatus[]): Promise<AnchorPRRecord[]> {
    if (statuses.length === 0) {
      return [];
    }

    const roots = await this.prRootRepo.findByStatuses(statuses);
    const records = await Promise.all(roots.map((root) => this.buildRecordForRequest(root)));
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
