import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type { AnchorEventPRContextRecord } from "../../../repositories/AnchorEventPRContextRepository";
import { countActivePartnersForPR } from "../../pr/services";
import { getEffectiveBookingDeadline } from "../../pr-booking-support";
import { readAnchorEventPRContextRecordsByEventTimeWindow } from "../../pr/services";
import {
  listAnchorEventTimeWindows,
  buildTimeWindowKey,
} from "../../anchor-event/services/time-window-pool";

const anchorEventRepo = new AnchorEventRepository();

type AdminPRSummary = {
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

type AdminAnchorTimeWindowSummary = {
  key: string;
  timeWindow: [string | null, string | null];
  prs: AdminPRSummary[];
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
  timePoolConfig: {
    durationMinutes: number | null;
    earliestLeadMinutes: number | null;
    startRules: Array<
      | {
          id: string;
          kind: "ABSOLUTE";
          startAt: string;
        }
      | {
          id: string;
          kind: "RECURRING";
          weekdays: number[];
          timeOfDay: string;
        }
    >;
  };
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  timeWindowPool: [string | null, string | null][];
  coverImage: string | null;
  betaGroupQrCode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  timeWindows: AdminAnchorTimeWindowSummary[];
};

export interface AdminAnchorWorkspace {
  events: AdminAnchorEventSummary[];
}

const toAdminPRSummary = async (
  record: AnchorEventPRContextRecord,
): Promise<AdminPRSummary> => ({
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
      const timeWindowPool = listAnchorEventTimeWindows(event);
      const timeWindowSummaries = await Promise.all(
        timeWindowPool.map(async (timeWindow) => {
          const prs = await readAnchorEventPRContextRecordsByEventTimeWindow(
            event.id,
            timeWindow,
            {
              consistency: "strong",
            },
          );
          const prSummaries = await Promise.all(
            prs.map((record) => toAdminPRSummary(record)),
          );

          return {
            key: buildTimeWindowKey(timeWindow),
            timeWindow,
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
        timePoolConfig: event.timePoolConfig,
        defaultMinPartners: event.defaultMinPartners ?? null,
        defaultMaxPartners: event.defaultMaxPartners ?? null,
        timeWindowPool,
        coverImage: event.coverImage,
        betaGroupQrCode: event.betaGroupQrCode,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        timeWindows: timeWindowSummaries,
      };
    }),
  );

  return { events: eventSummaries };
}
