import type { PartnerRequest } from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import {
  countActivePartnersForPR,
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../../pr/services";
import { getEffectiveBookingDeadline } from "../../pr-booking-support";

const anchorEventRepo = new AnchorEventRepository();
const prRepo = new PartnerRequestRepository();

export type AdminPRWorkspaceSummary = {
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
  effectiveBookingDeadlineAt: string | null;
  createdAt: string;
};

export type AdminPRTypeOption = {
  type: string;
  eventTitle: string;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
};

export interface AdminPRWorkspace {
  prs: AdminPRWorkspaceSummary[];
  typeOptions: AdminPRTypeOption[];
}

const toAdminPRWorkspaceSummary = async (
  root: PartnerRequest,
): Promise<AdminPRWorkspaceSummary> => ({
  prId: root.id,
  title: root.title,
  type: root.type,
  location: root.location,
  time: root.time,
  status: root.status,
  visibilityStatus: root.visibilityStatus,
  minPartners: root.minPartners,
  maxPartners: root.maxPartners,
  preferences: [...root.preferences],
  notes: root.notes,
  partnerCount: await countActivePartnersForPR(root.id),
  confirmationStartOffsetMinutes:
    root.confirmationStartOffsetMinutes ??
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  confirmationEndOffsetMinutes:
    root.confirmationEndOffsetMinutes ?? DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  joinLockOffsetMinutes:
    root.joinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  effectiveBookingDeadlineAt:
    (await getEffectiveBookingDeadline(root.id))?.toISOString() ?? null,
  createdAt: root.createdAt.toISOString(),
});

export async function getAdminPRWorkspace(): Promise<AdminPRWorkspace> {
  const [roots, events] = await Promise.all([
    prRepo.listAll(),
    anchorEventRepo.listAll(),
  ]);

  const prs = await Promise.all(
    roots.map((root) => toAdminPRWorkspaceSummary(root)),
  );

  const typeOptionsByType = new Map<string, AdminPRTypeOption>();
  for (const event of events) {
    if (typeOptionsByType.has(event.type)) {
      continue;
    }

    typeOptionsByType.set(event.type, {
      type: event.type,
      eventTitle: event.title,
      defaultMinPartners: event.defaultMinPartners ?? null,
      defaultMaxPartners: event.defaultMaxPartners ?? null,
      defaultConfirmationStartOffsetMinutes:
        event.defaultConfirmationStartOffsetMinutes ??
        DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
      defaultConfirmationEndOffsetMinutes:
        event.defaultConfirmationEndOffsetMinutes ??
        DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
      defaultJoinLockOffsetMinutes:
        event.defaultJoinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    });
  }

  return {
    prs,
    typeOptions: Array.from(typeOptionsByType.values()),
  };
}
