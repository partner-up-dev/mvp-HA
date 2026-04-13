import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import type { AnchorPRRecord } from "../../../repositories/AnchorPRRepository";
import { countActivePartnersForPR } from "../../pr-core/services/slot-management.service";
import { getEffectiveBookingDeadline } from "../../pr-booking-support";
import { readAnchorPRRecordsByBatchId } from "../../pr-core/services/pr-read.service";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

type AdminAnchorPRSummary = {
  prId: number;
  title: string | null;
  type: string;
  location: string | null;
  time: [string | null, string | null];
  status: string;
  visibilityStatus: string;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  partnerCount: number;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  bookingTriggeredAt: string | null;
  effectiveBookingDeadlineAt: string | null;
  createdAt: string;
};

type AdminAnchorBatchSummary = {
  id: number;
  timeWindow: [string | null, string | null];
  status: string;
  description: string | null;
  prs: AdminAnchorPRSummary[];
};

export type AdminAnchorEventSummary = {
  id: number;
  title: string;
  type: string;
  description: string | null;
  systemLocationPool: string[];
  userLocationPool: Array<{
    id: string;
    perBatchCap: number;
  }>;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  timeWindowPool: [string | null, string | null][];
  coverImage: string | null;
  betaGroupQrCode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  batches: AdminAnchorBatchSummary[];
};

export interface AdminAnchorWorkspace {
  events: AdminAnchorEventSummary[];
}

const toAdminAnchorPRSummary = async (
  record: AnchorPRRecord,
): Promise<AdminAnchorPRSummary> => ({
  prId: record.root.id,
  title: record.root.title,
  type: record.root.type,
  location: record.root.location,
  time: record.root.time,
  status: record.root.status,
  visibilityStatus: record.anchor.visibilityStatus,
  minPartners: record.root.minPartners,
  maxPartners: record.root.maxPartners,
  preferences: [...record.root.preferences],
  notes: record.root.notes,
  partnerCount: await countActivePartnersForPR(record.root.id),
  confirmationStartOffsetMinutes: record.anchor.confirmationStartOffsetMinutes,
  confirmationEndOffsetMinutes: record.anchor.confirmationEndOffsetMinutes,
  joinLockOffsetMinutes: record.anchor.joinLockOffsetMinutes,
  bookingTriggeredAt: record.anchor.bookingTriggeredAt?.toISOString() ?? null,
  effectiveBookingDeadlineAt:
    (await getEffectiveBookingDeadline(record.root.id))?.toISOString() ?? null,
  createdAt: record.root.createdAt.toISOString(),
});

export async function getAdminAnchorWorkspace(): Promise<AdminAnchorWorkspace> {
  const events = await anchorEventRepo.listAll();

  const eventSummaries = await Promise.all(
    events.map(async (event) => {
      const batches = await batchRepo.findByAnchorEventId(event.id);
      const batchSummaries = await Promise.all(
        [...batches]
          .sort((left, right) => {
            const leftStart = left.timeWindow[0] ?? "";
            const rightStart = right.timeWindow[0] ?? "";
            return leftStart.localeCompare(rightStart);
          })
          .map(async (batch) => {
            const prs = await readAnchorPRRecordsByBatchId(batch.id, {
              consistency: "strong",
            });
            const prSummaries = await Promise.all(
              prs.map((record) => toAdminAnchorPRSummary(record)),
            );

            return {
              id: batch.id,
              timeWindow: batch.timeWindow,
              status: batch.status,
              description: batch.description,
              prs: prSummaries,
            };
          }),
      );

      return {
        id: event.id,
        title: event.title,
        type: event.type,
        description: event.description,
        systemLocationPool: Array.isArray(event.systemLocationPool)
          ? [...event.systemLocationPool]
          : [],
        userLocationPool: Array.isArray(event.userLocationPool)
          ? event.userLocationPool.map((entry) => ({
              id: entry.id,
              perBatchCap: entry.perBatchCap,
            }))
          : [],
        defaultMinPartners: event.defaultMinPartners ?? null,
        defaultMaxPartners: event.defaultMaxPartners ?? null,
        timeWindowPool: Array.isArray(event.timeWindowPool)
          ? event.timeWindowPool.map(
              (entry): [string | null, string | null] => [entry[0], entry[1]],
            )
          : [],
        coverImage: event.coverImage,
        betaGroupQrCode: event.betaGroupQrCode,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        batches: batchSummaries,
      };
    }),
  );

  return { events: eventSummaries };
}
