import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PoiRepository } from "../../../repositories/PoiRepository";
import { initializeSlotsForPR } from "../../pr/services";
import type { PRId } from "../../../entities/partner-request";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { normalizeLocationPool } from "../../../entities/anchor-event";
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
const poiRepo = new PoiRepository();

const findNextAvailableLocation = (
  pool: string[],
  activeCountsByLocation: Map<string, number>,
  perTimeWindowCapByLocation: Map<string, number | null>,
): string | null => {
  for (const location of pool) {
    const cap = perTimeWindowCapByLocation.get(location) ?? null;
    if (cap === null || (activeCountsByLocation.get(location) ?? 0) < cap) {
      return location;
    }
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
  const locationPool = normalizeLocationPool(event.locationPool);
  const pois = await poiRepo.findByIds(locationPool);
  const perTimeWindowCapByLocation = new Map(
    pois.map((poi) => [poi.id, poi.perTimeWindowCap]),
  );
  const activeCountsByLocation = new Map<string, number>();
  for (const record of siblingPRs) {
    if (!isActiveVisiblePRStatus(record.root.status) || !record.root.location) {
      continue;
    }
    const location = record.root.location.trim();
    if (!locationPool.includes(location)) {
      continue;
    }
    activeCountsByLocation.set(
      location,
      (activeCountsByLocation.get(location) ?? 0) + 1,
    );
  }

  const targetLocation = findNextAvailableLocation(
    locationPool,
    activeCountsByLocation,
    perTimeWindowCapByLocation,
  );
  if (!targetLocation) {
    return;
  }

  const existingAtTarget =
    await readVisibleAnchorEventPRContextRecordsByEventTimeWindowAndLocation(
      fullPR.anchor.anchorEventId,
      fullPR.anchor.timeWindow,
      targetLocation,
    );
  const capAtTarget = perTimeWindowCapByLocation.get(targetLocation) ?? null;
  const activeAtTarget = existingAtTarget.filter((record) =>
    isActiveVisiblePRStatus(record.root.status),
  ).length;
  if (capAtTarget !== null && activeAtTarget >= capAtTarget) {
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

  await initializeSlotsForPR(createdRoot.id, null);
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
      anchorEventId: fullPR.anchor.anchorEventId,
      timeWindow: fullPR.anchor.timeWindow,
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
      timeWindow: fullPR.anchor.timeWindow,
      location: createdRoot.location,
    },
  });
}
