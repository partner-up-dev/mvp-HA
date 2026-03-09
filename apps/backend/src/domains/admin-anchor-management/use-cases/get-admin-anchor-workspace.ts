import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import {
  AnchorPRRepository,
  type AnchorPRRecord,
} from "../../../repositories/AnchorPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";

const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const anchorPRRepo = new AnchorPRRepository();
const partnerRepo = new PartnerRepository();

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
  createdAt: string;
};

type AdminAnchorBatchSummary = {
  id: number;
  timeWindow: [string | null, string | null];
  status: string;
  prs: AdminAnchorPRSummary[];
};

export type AdminAnchorEventSummary = {
  id: number;
  title: string;
  type: string;
  description: string | null;
  locationPool: string[];
  timeWindowPool: [string | null, string | null][];
  coverImage: string | null;
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
  partnerCount: await partnerRepo.countActiveByPrId(record.root.id),
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
            const prs = await anchorPRRepo.findByBatchId(batch.id);
            const prSummaries = await Promise.all(
              prs.map((record) => toAdminAnchorPRSummary(record)),
            );

            return {
              id: batch.id,
              timeWindow: batch.timeWindow,
              status: batch.status,
              prs: prSummaries,
            };
          }),
      );

      return {
        id: event.id,
        title: event.title,
        type: event.type,
        description: event.description,
        locationPool: Array.isArray(event.locationPool) ? [...event.locationPool] : [],
        timeWindowPool: Array.isArray(event.timeWindowPool)
          ? event.timeWindowPool.map(
              (entry): [string | null, string | null] => [entry[0], entry[1]],
            )
          : [],
        coverImage: event.coverImage,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        batches: batchSummaries,
      };
    }),
  );

  return { events: eventSummaries };
}
