/**
 * Slot management service — handles partner slot CRUD, capacity sync,
 * bounds validation, and status recalculation.
 */

import { HTTPException } from "hono/http-exception";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type {
  PRId,
} from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  deriveStatusFromPartnerCount,
  shouldRecalculateCapacityStatus,
} from "./status-rules";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

// ---------------------------------------------------------------------------
// Slot lifecycle
// ---------------------------------------------------------------------------

export async function initializeSlotsForPR(
  prId: PRId,
  creatorUserId: UserId | null,
): Promise<void> {
  if (creatorUserId) {
    await partnerRepo.createSlot({
      prId,
      userId: creatorUserId,
      status: "JOINED",
    });
  }
}

export async function syncSlotCapacity(
  prId: PRId,
  maxPartners: number | null,
): Promise<void> {
  if (maxPartners === null) return;
  const activeCount = await countActivePartnersForPR(prId);
  if (activeCount > maxPartners) {
    throw new HTTPException(400, {
      message:
        "Invalid partner bounds - maxPartners cannot be smaller than active participants",
    });
  }
}

// ---------------------------------------------------------------------------
// Status recalculation
// ---------------------------------------------------------------------------

export async function countActivePartnersForPR(prId: PRId): Promise<number> {
  return partnerRepo.countActiveByPrId(prId);
}

export async function listActiveParticipantSummariesForPR(prId: PRId) {
  return partnerRepo.listActiveParticipantSummariesByPrId(prId);
}

export async function recalculatePRStatus(prId: PRId): Promise<void> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const activeCount = await countActivePartnersForPR(prId);
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
