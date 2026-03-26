import type {
  AnchorEvent,
  AnchorEventBatch,
  AnchorPRSupportResource,
  OperationLogRow,
  PRId,
  User,
  UserId,
} from "../../../entities";
import { operationLogService } from "../../../infra/operation-log";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorPRBookingContactRepository } from "../../../repositories/AnchorPRBookingContactRepository";
import { AnchorPRBookingExecutionRepository } from "../../../repositories/AnchorPRBookingExecutionRepository";
import {
  AnchorPRRepository,
  type AnchorPRRecord,
} from "../../../repositories/AnchorPRRepository";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import {
  getEffectiveBookingDeadline,
  resolveBookingContactState,
} from "../../pr-booking-support";

const BOOKING_EXECUTION_LOG_LIMIT = 200;
const MANUAL_RELEASE_ACTION = "partner.admin_manual_release";

const anchorPRRepo = new AnchorPRRepository();
const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();
const bookingContactRepo = new AnchorPRBookingContactRepository();
const bookingExecutionRepo = new AnchorPRBookingExecutionRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();

type BookingExecutionContext = {
  record: AnchorPRRecord | null;
  event: AnchorEvent | null;
  batch: AnchorEventBatch | null;
};

export type AdminBookingExecutionPendingItem = {
  prId: number;
  prTitle: string | null;
  prType: string;
  location: string | null;
  timeWindow: [string | null, string | null];
  status: AnchorPRRecord["root"]["status"];
  partnerCount: number;
  eventId: number | null;
  eventTitle: string | null;
  batchId: number | null;
  batchTimeWindow: [string | null, string | null] | null;
  bookingTriggeredAt: string;
  effectiveBookingDeadlineAt: string | null;
  eligibleResources: Array<{
    id: number;
    title: string;
    summaryText: string;
    bookingDeadlineAt: string | null;
    bookingLocksParticipant: boolean;
  }>;
  bookingContact: {
    required: boolean;
    state: "NOT_REQUIRED" | "MISSING" | "VERIFIED";
    ownerPartnerId: number | null;
    ownerUserId: string | null;
    ownerNickname: string | null;
    fullPhone: string | null;
    maskedPhone: string | null;
    verifiedAt: string | null;
    deadlineAt: string | null;
  };
};

type BookingExecutionAuditBase = {
  createdAt: string;
  prId: number;
  prTitle: string | null;
  prType: string | null;
  location: string | null;
  timeWindow: [string | null, string | null] | null;
  eventId: number | null;
  eventTitle: string | null;
  batchId: number | null;
  batchTimeWindow: [string | null, string | null] | null;
  actorUserId: string | null;
  actorLabel: string | null;
  bookingContactPhone: string | null;
};

export type AdminBookingExecutionAuditItem =
  | (BookingExecutionAuditBase & {
      kind: "BOOKING_EXECUTION";
      result: "SUCCESS" | "FAILED";
      reason: string | null;
      targetResourceTitle: string;
      notificationSummary: {
        targetCount: number;
        successCount: number;
        failureCount: number;
        skippedCount: number;
      };
    })
  | (BookingExecutionAuditBase & {
      kind: "MANUAL_RELEASE";
      partnerId: number | null;
      releasedUserId: string | null;
      reason: string | null;
      bookingContactCleared: boolean;
      creatorTransferredToUserId: string | null;
    });

export type AdminBookingExecutionWorkspace = {
  pendingItems: AdminBookingExecutionPendingItem[];
  auditItems: AdminBookingExecutionAuditItem[];
};

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

const isPlatformBookingResource = (resource: AnchorPRSupportResource): boolean =>
  resource.bookingRequired && resource.bookingHandledBy === "PLATFORM";

const parsePrId = (value: string): PRId | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed as PRId;
};

const readDetailRecord = (
  detail: Record<string, unknown> | null | undefined,
): Record<string, unknown> => detail ?? {};

const readNumberDetail = (
  detail: Record<string, unknown>,
  key: string,
): number | null => {
  const value = detail[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const readStringDetail = (
  detail: Record<string, unknown>,
  key: string,
): string | null => {
  const value = detail[key];
  return typeof value === "string" ? value : null;
};

const readBooleanDetail = (
  detail: Record<string, unknown>,
  key: string,
): boolean => detail[key] === true;

const buildActorLabel = (
  user: User | null,
  actorUserId: string | null,
): string | null => {
  if (user?.nickname?.trim()) {
    return user.nickname.trim();
  }
  return actorUserId;
};

export async function getAdminBookingExecutionWorkspace(): Promise<AdminBookingExecutionWorkspace> {
  const executionRows = await bookingExecutionRepo.listAll();
  const executedPrIds = new Set(executionRows.map((row) => row.prId));
  const manualReleaseLogs = await operationLogService.queryByAction(
    "partner_request",
    MANUAL_RELEASE_ACTION,
    BOOKING_EXECUTION_LOG_LIMIT,
  );
  const triggeredRecords = await anchorPRRepo.findBookingTriggeredRecords();

  const seededContextMap = new Map<PRId, AnchorPRRecord>(
    triggeredRecords.map((record) => [record.root.id, record]),
  );
  const contextCache = new Map<PRId, Promise<BookingExecutionContext>>();
  const actorCache = new Map<string, Promise<User | null>>();

  const loadContext = (prId: PRId): Promise<BookingExecutionContext> => {
    const cached = contextCache.get(prId);
    if (cached) {
      return cached;
    }

    const promise = (async (): Promise<BookingExecutionContext> => {
      const record =
        seededContextMap.get(prId) ?? (await anchorPRRepo.findRecordByPrId(prId));
      if (!record) {
        return {
          record: null,
          event: null,
          batch: null,
        };
      }

      const [event, batch] = await Promise.all([
        anchorEventRepo.findById(record.anchor.anchorEventId),
        batchRepo.findById(record.anchor.batchId),
      ]);

      return { record, event, batch };
    })();

    contextCache.set(prId, promise);
    return promise;
  };

  const loadActor = (actorUserId: string | null): Promise<User | null> => {
    if (!actorUserId) {
      return Promise.resolve(null);
    }

    const cached = actorCache.get(actorUserId);
    if (cached) {
      return cached;
    }

    const promise = userRepo.findById(actorUserId as UserId);
    actorCache.set(actorUserId, promise);
    return promise;
  };

  const pendingItemsRaw = await Promise.all(
    triggeredRecords.map(async (record) => {
      if (executedPrIds.has(record.root.id)) {
        return null;
      }

      const resources = await prSupportRepo.findByPrId(record.root.id);
      const eligibleResources = resources.filter(isPlatformBookingResource);
      if (eligibleResources.length === 0) {
        return null;
      }

      const activeParticipants =
        await partnerRepo.listActiveParticipantSummariesByPrId(record.root.id);
      const effectiveBookingDeadlineAt = await getEffectiveBookingDeadline(
        record.root.id,
      );
      const bookingContactState = await resolveBookingContactState({
        prId: record.root.id,
        viewerUserId: null,
        supportResources: resources,
        effectiveBookingDeadlineAt,
      });
      const bookingContact = await bookingContactRepo.findByPrId(record.root.id);
      const ownerParticipant =
        bookingContactState.ownerPartnerId === null
          ? null
          : activeParticipants.find(
              (participant) =>
                participant.partnerId === bookingContactState.ownerPartnerId,
            ) ?? null;
      const [event, batch] = await Promise.all([
        anchorEventRepo.findById(record.anchor.anchorEventId),
        batchRepo.findById(record.anchor.batchId),
      ]);

      return {
        prId: record.root.id,
        prTitle: record.root.title,
        prType: record.root.type,
        location: record.root.location,
        timeWindow: record.root.time,
        status: record.root.status,
        partnerCount: activeParticipants.length,
        eventId: event?.id ?? null,
        eventTitle: event?.title ?? null,
        batchId: batch?.id ?? null,
        batchTimeWindow: batch?.timeWindow ?? null,
        bookingTriggeredAt: record.anchor.bookingTriggeredAt?.toISOString() ?? "",
        effectiveBookingDeadlineAt: toIsoString(effectiveBookingDeadlineAt),
        eligibleResources: eligibleResources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          summaryText: resource.summaryText,
          bookingDeadlineAt: toIsoString(resource.bookingDeadlineAt),
          bookingLocksParticipant: resource.bookingLocksParticipant,
        })),
        bookingContact: {
          required: bookingContactState.required,
          state: bookingContactState.state,
          ownerPartnerId: bookingContactState.ownerPartnerId,
          ownerUserId: ownerParticipant?.userId ?? null,
          ownerNickname: ownerParticipant?.nickname ?? null,
          fullPhone: bookingContact?.phoneE164 ?? null,
          maskedPhone: bookingContact?.phoneMasked ?? null,
          verifiedAt: bookingContactState.verifiedAt,
          deadlineAt: bookingContactState.deadlineAt,
        },
      } satisfies AdminBookingExecutionPendingItem;
    }),
  );

  const pendingItems: AdminBookingExecutionPendingItem[] = pendingItemsRaw.flatMap(
    (item) => (item ? [item] : []),
  );
  pendingItems.sort((left, right) => {
    const leftKey = left.effectiveBookingDeadlineAt ?? left.bookingTriggeredAt;
    const rightKey = right.effectiveBookingDeadlineAt ?? right.bookingTriggeredAt;
    return leftKey.localeCompare(rightKey);
  });

  const executionAuditItems = await Promise.all(
    executionRows.map(async (row) => {
      const [context, actor] = await Promise.all([
        loadContext(row.prId),
        loadActor(row.actorUserId),
      ]);

      return {
        kind: "BOOKING_EXECUTION",
        createdAt: row.createdAt.toISOString(),
        prId: row.prId,
        prTitle: context.record?.root.title ?? null,
        prType: context.record?.root.type ?? null,
        location: context.record?.root.location ?? null,
        timeWindow: context.record?.root.time ?? null,
        eventId: context.event?.id ?? null,
        eventTitle: context.event?.title ?? null,
        batchId: context.batch?.id ?? null,
        batchTimeWindow: context.batch?.timeWindow ?? null,
        actorUserId: row.actorUserId,
        actorLabel: buildActorLabel(actor, row.actorUserId),
        bookingContactPhone: row.bookingContactPhone ?? null,
        result: row.result,
        reason: row.reason ?? null,
        targetResourceTitle: row.targetResourceTitle,
        notificationSummary: {
          targetCount: row.notificationTargetCount,
          successCount: row.notificationSuccessCount,
          failureCount: row.notificationFailureCount,
          skippedCount: row.notificationSkippedCount,
        },
      } satisfies AdminBookingExecutionAuditItem;
    }),
  );

  const manualReleaseAuditItems = await Promise.all(
    manualReleaseLogs.map(async (row: OperationLogRow) => {
      const prId = parsePrId(row.aggregateId);
      const context =
        prId === null
          ? {
              record: null,
              event: null,
              batch: null,
            }
          : await loadContext(prId);
      const actor = await loadActor(row.actorId);
      const detail = readDetailRecord(row.detail);

      return {
        kind: "MANUAL_RELEASE",
        createdAt: row.createdAt.toISOString(),
        prId: prId ?? 0,
        prTitle: context.record?.root.title ?? null,
        prType: context.record?.root.type ?? null,
        location: context.record?.root.location ?? null,
        timeWindow: context.record?.root.time ?? null,
        eventId: context.event?.id ?? null,
        eventTitle: context.event?.title ?? null,
        batchId: context.batch?.id ?? null,
        batchTimeWindow: context.batch?.timeWindow ?? null,
        actorUserId: row.actorId,
        actorLabel: buildActorLabel(actor, row.actorId),
        bookingContactPhone: readStringDetail(detail, "bookingContactPhone"),
        partnerId: readNumberDetail(detail, "partnerId"),
        releasedUserId: readStringDetail(detail, "releasedUserId"),
        reason: readStringDetail(detail, "reason"),
        bookingContactCleared: readBooleanDetail(detail, "bookingContactCleared"),
        creatorTransferredToUserId: readStringDetail(
          detail,
          "creatorTransferredToUserId",
        ),
      } satisfies AdminBookingExecutionAuditItem;
    }),
  );

  const auditItems = [...executionAuditItems, ...manualReleaseAuditItems].sort(
    (left, right) => right.createdAt.localeCompare(left.createdAt),
  );

  return {
    pendingItems,
    auditItems,
  };
}
