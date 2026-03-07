import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { initializeSlotsForPR } from "../../pr-core/services/slot-management.service";
import { resolveAnchorEconomicPolicy } from "../../pr-core/services/economic-policy.service";
import type { PRId } from "../../../entities/partner-request";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { normalizeLocationPool } from "../../../entities/anchor-event";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const anchorPRRepo = new AnchorPRRepository();
const partnerRepo = new PartnerRepository();

const isOccupiedStatus = (status: string): boolean =>
  status !== "EXPIRED" && status !== "CLOSED";

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
 * Phase 2: when an Anchor PR becomes FULL, auto-create a new Anchor PR under
 * the same batch (same time window), using a different location in the same
 * Anchor Event location pool.
 */
export async function expandFullAnchorPR(prId: PRId): Promise<void> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (request.prKind !== "ANCHOR" || request.status !== "FULL") {
    return;
  }

  const fullPR = await anchorPRRepo.findRecordByPrId(prId);
  if (!fullPR) {
    throw new HTTPException(500, {
      message: "Anchor PR subtype row missing",
    });
  }

  const event = await anchorEventRepo.findById(fullPR.anchor.anchorEventId);
  if (!event || event.status !== "ACTIVE") {
    return;
  }
  const batch = await batchRepo.findById(fullPR.anchor.batchId);
  if (!batch) return;

  const batchPRs = await anchorPRRepo.findVisibleByBatchId(fullPR.anchor.batchId);
  const occupiedLocations = new Set<string>(
    batchPRs
      .filter(
        (record) =>
          isOccupiedStatus(record.root.status) && !!record.root.location,
      )
      .map((record) => record.root.location as string),
  );

  const locationPool = normalizeLocationPool(event.locationPool);
  const targetLocation = findNextAvailableLocation(
    locationPool,
    occupiedLocations,
  );
  if (!targetLocation) {
    return;
  }

  // Best-effort idempotency: if a visible PR already exists at target location,
  // do not create a duplicate.
  const existingAtTarget = await anchorPRRepo.findVisibleByBatchIdAndLocation(
    fullPR.anchor.batchId,
    targetLocation,
  );
  if (existingAtTarget.some((record) => isOccupiedStatus(record.root.status))) {
    return;
  }

  const resolvedPolicy = resolveAnchorEconomicPolicy(
    event,
    batch,
    fullPR.root.time,
  );
  const createdRoot = await prRepo.create({
    title: fullPR.root.title,
    type: fullPR.root.type,
    time: fullPR.root.time,
    location: targetLocation,
    status: "OPEN",
    minPartners: fullPR.root.minPartners,
    maxPartners: fullPR.root.maxPartners,
    preferences: fullPR.root.preferences,
    notes: fullPR.root.notes,
    prKind: "ANCHOR",
  });
  const createdAnchor = await anchorPRRepo.create({
    prId: createdRoot.id,
    anchorEventId: fullPR.anchor.anchorEventId,
    batchId: fullPR.anchor.batchId,
    visibilityStatus: "VISIBLE",
    autoHideAt: fullPR.anchor.autoHideAt,
    resourceBookingDeadlineAt: resolvedPolicy.resourceBookingDeadlineAt,
    paymentModelApplied: resolvedPolicy.paymentModelApplied,
    discountRateApplied: resolvedPolicy.discountRateApplied,
    subsidyCapApplied: resolvedPolicy.subsidyCapApplied,
    cancellationPolicyApplied: resolvedPolicy.cancellationPolicyApplied,
    economicPolicyScopeApplied: resolvedPolicy.economicPolicyScopeApplied,
    economicPolicyVersionApplied: resolvedPolicy.economicPolicyVersionApplied,
  });

  await initializeSlotsForPR(
    createdRoot.id,
    "ANCHOR",
    createdRoot.minPartners,
    createdRoot.maxPartners,
    null,
    createdRoot.time,
  );

  const activeCount = await partnerRepo.countActiveByPrId(prId);
  const eventRecord = await eventBus.publish(
    "anchor.pr.auto_created",
    "partner_request",
    String(createdRoot.id),
    {
      sourcePrId: prId,
      createdPrId: createdRoot.id,
      anchorEventId: createdAnchor.anchorEventId,
      batchId: createdAnchor.batchId,
      location: createdRoot.location,
      activeCountAtSource: activeCount,
    },
  );
  void writeToOutbox(eventRecord);

  operationLogService.log({
    actorId: null,
    action: "anchor.pr.auto_create",
    aggregateType: "partner_request",
    aggregateId: String(createdRoot.id),
    detail: {
      sourcePrId: prId,
      batchId: createdAnchor.batchId,
      location: createdRoot.location,
    },
  });
}
