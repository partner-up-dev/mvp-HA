import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  PRId,
  PartnerRequestFields,
} from "../../../entities/partner-request";
import {
  assertPartnerBoundsValid,
  syncSlotCapacity,
  recalculatePRStatus,
} from "../services/slot-management.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export async function updatePRContent(
  id: PRId,
  fields: PartnerRequestFields,
  pin: string,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  if (
    refreshedRequest.status !== "OPEN" &&
    refreshedRequest.status !== "DRAFT"
  ) {
    throw new HTTPException(400, {
      message:
        "Cannot edit - only OPEN or DRAFT partner requests can be edited",
    });
  }

  const isValid = await bcrypt.compare(pin, refreshedRequest.pinHash);
  if (!isValid) {
    throw new HTTPException(403, { message: "Invalid PIN" });
  }

  const minMaxChanged =
    refreshedRequest.minPartners !== fields.minPartners ||
    refreshedRequest.maxPartners !== fields.maxPartners;
  const currentParticipants = await partnerRepo.countActiveByPrId(id);
  assertPartnerBoundsValid(
    fields.minPartners,
    fields.maxPartners,
    currentParticipants,
  );

  const updated = await prRepo.updateFields(id, fields);
  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update content" });
  }

  if (minMaxChanged) {
    await syncSlotCapacity(id, fields.minPartners, fields.maxPartners);
  }
  await prRepo.clearPosterCache(id);

  if (minMaxChanged && refreshedRequest.status !== "DRAFT") {
    await recalculatePRStatus(id);
  }

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to reload partner request",
    });
  }

  // Emit domain event
  const event = await eventBus.publish(
    "pr.content_updated",
    "partner_request",
    String(id),
    { prId: id },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: null,
    action: "pr.update_content",
    aggregateType: "partner_request",
    aggregateId: String(id),
  });

  return toPublicPR(latest, null);
}
