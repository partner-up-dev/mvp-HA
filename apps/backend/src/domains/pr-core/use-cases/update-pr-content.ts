import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type {
  PRId,
  PartnerRequestFields,
} from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  countActivePartnersForPR,
  listActiveParticipantSummariesForPR,
  syncSlotCapacity,
  recalculatePRStatus,
} from "../services/slot-management.service";
import { assertManualPartnerBoundsValid } from "../services/partner-bounds.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import {
  captureEffectiveMeetingPointsForRequests,
  scheduleMeetingPointNotificationsForChangedRequests,
} from "../services/meeting-point-change-notifier.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();

export interface UpdatePRContentOptions {
  bypassEditableStatusGuard?: boolean;
  preserveStatus?: boolean;
}

export async function updatePRContent(
  id: PRId,
  fields: PartnerRequestFields,
  actorUserId: UserId | null,
  options: UpdatePRContentOptions = {},
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  if (
    !options.bypassEditableStatusGuard &&
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
  assertManualPartnerBoundsValid(
    fields.minPartners,
    fields.maxPartners,
    currentParticipants,
  );
  await assertPRTimeWindowAvailableAtLocation({
    location: fields.location,
    timeWindow: fields.time,
  });
  const previousMeetingPoints = await captureEffectiveMeetingPointsForRequests([
    refreshedRequest,
  ]);

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

  if (minMaxChanged) {
    await syncSlotCapacity(id, fields.maxPartners);
  }
  await prRepo.clearPosterCache(id);

  if (
    minMaxChanged &&
    refreshedRequest.status !== "DRAFT" &&
    !options.preserveStatus
  ) {
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

  await scheduleMeetingPointNotificationsForChangedRequests({
    previous: previousMeetingPoints,
    requests: [latest],
    updatedAt: new Date(),
  });

  return toPublicPR(latest, null);
}
