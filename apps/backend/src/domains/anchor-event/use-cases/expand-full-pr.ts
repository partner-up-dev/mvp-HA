import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import {
  type AnchorEventPRContext,
  AnchorEventPRContextRepository,
} from "../../../repositories/AnchorEventPRContextRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { initializeSlotsForPR } from "../../pr/services";
import type { PRId } from "../../../entities/partner-request";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { normalizeSystemLocationPool } from "../../../entities/anchor-event";
import { materializePRSupportResources } from "../../pr-booking-support";
import { hasAnchorParticipationPolicy } from "../../pr/services";
import {
  isActiveVisiblePRStatus,
  readVisibleAnchorEventPRContextRecordsByEventTimeWindow,
  readVisibleAnchorEventPRContextRecordsByEventTimeWindowAndLocation,
} from "../../pr/services";
import { normalizeAutomaticPartnerBounds } from "../../pr/services";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();
const eventContextRepo = new AnchorEventPRContextRepository();
const partnerRepo = new PartnerRepository();

const findNextAvailableLocation = (
  pool: string[],
  occupiedLocations: Set<string>,
): string | null => {
  for (const location of pool) {
    if (!occupiedLocations.has(location)) return location;
  }
  return null;
};

/**
 * Phase 2: when a PR becomes FULL, auto-create a new PR under
 * the same event time window, using a different location in the same
 * event location pool.
 */
export async function expandFullPR(prId: PRId): Promise<void> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (!hasAnchorParticipationPolicy(request) || request.status !== "FULL") {
    return;
  }

  const fullPR = await eventContextRepo.findRecordByPrId(prId);
  if (!fullPR) {
    throw new HTTPException(500, {
      message: "PR event context missing",
    });
  }

  const event = await anchorEventRepo.findById(fullPR.anchor.anchorEventId);
  if (!event || event.status !== "ACTIVE") {
    return;
  }

  const siblingPRs = await readVisibleAnchorEventPRContextRecordsByEventTimeWindow(
    fullPR.anchor.anchorEventId,
    fullPR.anchor.timeWindow,
  );
  const occupiedLocations = new Set<string>(
    siblingPRs
      .filter(
        (record) =>
          isActiveVisiblePRStatus(record.root.status) &&
          !!record.root.location,
      )
      .map((record) => record.root.location as string),
  );

  const locationPool = normalizeSystemLocationPool(event.systemLocationPool);
  const targetLocation = findNextAvailableLocation(
    locationPool,
    occupiedLocations,
  );
  if (!targetLocation) {
    return;
  }

  // Best-effort idempotency: if a visible PR already exists at target location,
  // do not create a duplicate.
  const existingAtTarget =
    await readVisibleAnchorEventPRContextRecordsByEventTimeWindowAndLocation(
      fullPR.anchor.anchorEventId,
      fullPR.anchor.timeWindow,
      targetLocation,
    );
  if (
    existingAtTarget.some((record) =>
      isActiveVisiblePRStatus(record.root.status),
    )
  ) {
    return;
  }
  const partnerBounds = normalizeAutomaticPartnerBounds(
    fullPR.root.minPartners,
    fullPR.root.maxPartners,
    0,
  );

  const createdRoot = await prRepo.create({
    title: fullPR.root.title,
    type: fullPR.root.type,
    time: fullPR.root.time,
    location: targetLocation,
    status: "OPEN",
    visibilityStatus: "VISIBLE",
    minPartners: partnerBounds.minPartners,
    maxPartners: partnerBounds.maxPartners,
    preferences: fullPR.root.preferences,
    notes: fullPR.root.notes,
    confirmationStartOffsetMinutes:
      fullPR.root.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: fullPR.root.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: fullPR.root.joinLockOffsetMinutes,
  });
  const createdAnchor: AnchorEventPRContext = {
    prId: createdRoot.id,
    anchorEventId: fullPR.anchor.anchorEventId,
    timeWindow: fullPR.anchor.timeWindow,
    locationSource: "SYSTEM",
    visibilityStatus: "VISIBLE",
    confirmationStartOffsetMinutes:
      createdRoot.confirmationStartOffsetMinutes ?? 120,
    confirmationEndOffsetMinutes:
      createdRoot.confirmationEndOffsetMinutes ?? 30,
    joinLockOffsetMinutes: createdRoot.joinLockOffsetMinutes ?? 30,
    bookingTriggeredAt: null,
    autoHideAt: null,
  };

  await initializeSlotsForPR(
    createdRoot.id,
    null,
  );
  await materializePRSupportResources({
    prId: createdRoot.id,
    anchorEventId: fullPR.anchor.anchorEventId,
    location: createdRoot.location,
    timeWindow: createdRoot.time,
  });

  const activeCount = await partnerRepo.countActiveByPrId(prId);
  const eventRecord = await eventBus.publish(
    "pr.auto_created",
    "partner_request",
    String(createdRoot.id),
    {
      sourcePrId: prId,
      createdPrId: createdRoot.id,
      anchorEventId: createdAnchor.anchorEventId,
      timeWindow: createdAnchor.timeWindow,
      location: createdRoot.location,
      activeCountAtSource: activeCount,
    },
  );
  void writeToOutbox(eventRecord);

  operationLogService.log({
    actorId: null,
    action: "pr.auto_create",
    aggregateType: "partner_request",
    aggregateId: String(createdRoot.id),
    detail: {
      sourcePrId: prId,
      timeWindow: createdAnchor.timeWindow,
      location: createdRoot.location,
    },
  });
}
