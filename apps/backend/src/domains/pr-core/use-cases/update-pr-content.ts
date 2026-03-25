import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { CommunityPRRepository } from "../../../repositories/CommunityPRRepository";
import type {
  PRId,
  PartnerRequestFields,
} from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  assertPartnerBoundsValid,
  countActivePartnersForPR,
  listActiveParticipantSummariesForPR,
  syncSlotCapacity,
  recalculatePRStatus,
} from "../services/slot-management.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const communityPRRepo = new CommunityPRRepository();

export async function updatePRContent(
  id: PRId,
  fields: PartnerRequestFields,
  actorUserId: UserId | null,
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

  const minMaxChanged =
    refreshedRequest.minPartners !== fields.minPartners ||
    refreshedRequest.maxPartners !== fields.maxPartners;
  const timeChanged =
    refreshedRequest.time[0] !== fields.time[0] ||
    refreshedRequest.time[1] !== fields.time[1];
  const currentParticipants = await countActivePartnersForPR(id);
  assertPartnerBoundsValid(
    fields.minPartners,
    fields.maxPartners,
    currentParticipants,
  );

  if (timeChanged && refreshedRequest.status !== "DRAFT") {
    const activeParticipants = await listActiveParticipantSummariesForPR(id);
    const participantUserIds = Array.from(
      new Set(activeParticipants.map((participant) => participant.userId)),
    );

    for (const participantUserId of participantUserIds) {
      await assertNoUserTimeWindowConflict({
        userId: participantUserId,
        targetTimeWindow: fields.time,
        excludePrId: id,
      });
    }
  }

  const updated = await prRepo.updateFields(id, fields);
  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update content" });
  }
  if (refreshedRequest.prKind === "COMMUNITY") {
    const updatedCommunity = await communityPRRepo.updateBudget(id, fields.budget);
    if (!updatedCommunity) {
      throw new HTTPException(500, {
        message: "Failed to update community PR content",
      });
    }
  }

  if (minMaxChanged) {
    await syncSlotCapacity(id, fields.maxPartners);
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
    actorId: actorUserId,
    action: "pr.update_content",
    aggregateType: "partner_request",
    aggregateId: String(id),
  });

  return toPublicPR(latest, null);
}
