/**
 * Slot management service — handles partner slot CRUD, capacity sync,
 * bounds validation, and status recalculation.
 */

import { HTTPException } from "hono/http-exception";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PartnerStatus } from "../../../entities/partner";
import type {
  PRId,
  PartnerRequestFields,
} from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  shouldAutoConfirmImmediately,
  isJoinLockedByTime,
} from "./time-window.service";
import {
  deriveStatusFromPartnerCount,
  shouldRecalculateCapacityStatus,
} from "./status-rules";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

// ---------------------------------------------------------------------------
// Bounds validation
// ---------------------------------------------------------------------------

export function assertPartnerBoundsValid(
  minPartners: number | null,
  maxPartners: number | null,
  currentParticipants: number,
): void {
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

// ---------------------------------------------------------------------------
// Desired slot count
// ---------------------------------------------------------------------------

export function resolveDesiredSlotCount(
  minPartners: number | null,
  maxPartners: number | null,
): number {
  if (maxPartners !== null) return Math.max(1, maxPartners);
  if (minPartners !== null) return Math.max(1, minPartners);
  return 1;
}

// ---------------------------------------------------------------------------
// Slot lifecycle
// ---------------------------------------------------------------------------

export async function initializeSlotsForPR(
  prId: PRId,
  minPartners: number | null,
  maxPartners: number | null,
  creatorUserId: UserId | null,
  timeWindow: PartnerRequestFields["time"],
): Promise<void> {
  const desired = resolveDesiredSlotCount(minPartners, maxPartners);

  if (creatorUserId) {
    const creatorStatus: PartnerStatus =
      shouldAutoConfirmImmediately(timeWindow) || isJoinLockedByTime(timeWindow)
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

export async function syncSlotCapacity(
  prId: PRId,
  minPartners: number | null,
  maxPartners: number | null,
): Promise<void> {
  const desired = resolveDesiredSlotCount(minPartners, maxPartners);
  const slots = await partnerRepo.findByPrId(prId);
  const currentTotal = slots.length;

  if (currentTotal < desired) {
    await partnerRepo.createReleasedSlots(prId, desired - currentTotal);
    return;
  }

  if (currentTotal === desired) return;

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

// ---------------------------------------------------------------------------
// Status recalculation
// ---------------------------------------------------------------------------

export async function recalculatePRStatus(prId: PRId): Promise<void> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const activeCount = await partnerRepo.countActiveByPrId(prId);
  const nextStatus = deriveStatusFromPartnerCount(
    activeCount,
    request.minPartners,
    request.maxPartners,
  );
  if (
    shouldRecalculateCapacityStatus(request.status as string) &&
    request.status !== nextStatus
  ) {
    await prRepo.updateStatus(prId, nextStatus);
  }
}
