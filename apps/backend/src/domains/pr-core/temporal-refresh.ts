/**
 * Temporal status refresh — shared helper for use-cases that need to
 * ensure a PR's status reflects the current time before proceeding.
 */

import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { UserRepository } from "../../repositories/UserRepository";
import type { PartnerRequest } from "../../entities/partner-request";
import {
  getTimeWindowStart,
  getTimeWindowClose,
  getConfirmDeadline,
} from "./services/time-window.service";
import {
  isActivatableStatus,
  isExpirableStatus,
} from "./services/status-rules";
import { recalculatePRStatus } from "./services/slot-management.service";
import { cancelWeChatReminderJobsForParticipant } from "../../infra/notifications";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();

/**
 * Refresh a PR's temporal state: release unconfirmed slots, activate if
 * within window, expire if past window-close.
 */
export async function refreshTemporalStatus(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  await releaseUnconfirmedSlotsIfNeeded(request);
  const afterRelease = await prRepo.findById(request.id);
  const normalized = afterRelease ?? request;
  const activated = await activateIfNeeded(normalized);
  return expireIfNeeded(activated);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function activateIfNeeded(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  if (!isActivatableStatus(request.status as string)) return request;

  const windowStart = getTimeWindowStart(request.time);
  if (!windowStart) return request;

  const now = Date.now();
  if (windowStart.getTime() > now) return request;

  const windowClose = getTimeWindowClose(request.time);
  if (windowClose && windowClose.getTime() <= now) return request;

  const updated = await prRepo.updateStatus(request.id, "ACTIVE");
  return updated ?? request;
}

async function expireIfNeeded(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  if (!isExpirableStatus(request.status as string)) return request;

  const windowClose = getTimeWindowClose(request.time);
  if (!windowClose) return request;
  if (windowClose.getTime() > Date.now()) return request;

  const updated = await prRepo.updateStatus(request.id, "EXPIRED");
  return updated ?? request;
}

async function releaseUnconfirmedSlotsIfNeeded(
  request: PartnerRequest,
): Promise<void> {
  const confirmDeadline = getConfirmDeadline(request.time);
  if (!confirmDeadline) return;
  if (Date.now() < confirmDeadline.getTime()) return;

  const slots = await partnerRepo.findByPrId(request.id);
  const releasing = slots.filter((slot) => slot.status === "JOINED");
  if (releasing.length === 0) return;

  for (const slot of releasing) {
    if (slot.userId) {
      await userRepo.applyReliabilityDelta(slot.userId, { released: 1 });
      await cancelWeChatReminderJobsForParticipant(request.id, slot.userId);
    }
    await partnerRepo.markReleased(slot.id);
  }

  await recalculatePRStatus(request.id);
}
