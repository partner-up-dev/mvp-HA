import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { initializeSlotsForPR } from "../../pr-core/services/slot-management.service";
import { resolveAnchorEconomicPolicy } from "../../pr-core/services/economic-policy.service";
import type { PRId } from "../../../entities/partner-request";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const partnerRepo = new PartnerRepository();

const isOccupiedStatus = (status: string): boolean =>
  status !== "EXPIRED" && status !== "CLOSED";

const findNextAvailableLocation = (
  pool: Array<{ key: string; label: string }>,
  occupiedLocations: Set<string>,
): string | null => {
  for (const entry of pool) {
    const keyTaken = occupiedLocations.has(entry.key);
    const labelTaken = occupiedLocations.has(entry.label);
    if (!keyTaken && !labelTaken) return entry.label;
  }
  return null;
};

const generateSystemPin = (): string => {
  const value = Math.floor(1000 + Math.random() * 9000);
  return String(value);
};

/**
 * Phase 2: when an Anchor PR becomes FULL, auto-create a new Anchor PR under
 * the same batch (same time window), using a different location in the same
 * Anchor Event location pool.
 */
export async function expandFullAnchorPR(prId: PRId): Promise<void> {
  const fullPR = await prRepo.findById(prId);
  if (!fullPR) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  if (
    fullPR.prKind !== "ANCHOR" ||
    fullPR.status !== "FULL" ||
    fullPR.anchorEventId === null ||
    fullPR.batchId === null
  ) {
    return;
  }

  const event = await anchorEventRepo.findById(fullPR.anchorEventId);
  if (!event || event.status !== "ACTIVE") {
    return;
  }
  const batch = await batchRepo.findById(fullPR.batchId);
  if (!batch) return;

  const batchPRs = await prRepo.findByBatchId(fullPR.batchId);
  const occupiedLocations = new Set(
    batchPRs
      .filter((pr) => isOccupiedStatus(pr.status) && !!pr.location)
      .map((pr) => pr.location as string),
  );

  const locationPool = event.locationPool ?? [];
  const targetLocationKey = findNextAvailableLocation(
    locationPool,
    occupiedLocations,
  );
  if (!targetLocationKey) {
    return;
  }

  // Best-effort idempotency: if a visible PR already exists at target location,
  // do not create a duplicate.
  const existingAtTarget = await prRepo.findByBatchIdAndLocation(
    fullPR.batchId,
    targetLocationKey,
  );
  if (existingAtTarget.some((pr) => isOccupiedStatus(pr.status))) {
    return;
  }

  const pinHash = await bcrypt.hash(generateSystemPin(), 10);
  const resolvedPolicy = resolveAnchorEconomicPolicy(event, batch, fullPR.time);
  const created = await prRepo.create({
    rawText: fullPR.rawText,
    title: fullPR.title,
    type: fullPR.type,
    time: fullPR.time,
    location: targetLocationKey,
    status: "OPEN",
    pinHash,
    minPartners: fullPR.minPartners,
    maxPartners: fullPR.maxPartners,
    budget: fullPR.budget,
    preferences: fullPR.preferences,
    notes: fullPR.notes,
    prKind: "ANCHOR",
    anchorEventId: fullPR.anchorEventId,
    batchId: fullPR.batchId,
    visibilityStatus: "VISIBLE",
    autoHideAt: fullPR.autoHideAt,
    resourceBookingDeadlineAt: resolvedPolicy.resourceBookingDeadlineAt,
    paymentModelApplied: resolvedPolicy.paymentModelApplied,
    discountRateApplied: resolvedPolicy.discountRateApplied,
    subsidyCapApplied: resolvedPolicy.subsidyCapApplied,
    cancellationPolicyApplied: resolvedPolicy.cancellationPolicyApplied,
    economicPolicyScopeApplied: resolvedPolicy.economicPolicyScopeApplied,
    economicPolicyVersionApplied: resolvedPolicy.economicPolicyVersionApplied,
  });

  await initializeSlotsForPR(
    created.id,
    created.minPartners,
    created.maxPartners,
    null,
    created.time,
  );

  const activeCount = await partnerRepo.countActiveByPrId(prId);
  const eventRecord = await eventBus.publish(
    "anchor.pr.auto_created",
    "partner_request",
    String(created.id),
    {
      sourcePrId: prId,
      createdPrId: created.id,
      anchorEventId: created.anchorEventId,
      batchId: created.batchId,
      location: created.location,
      activeCountAtSource: activeCount,
    },
  );
  void writeToOutbox(eventRecord);

  operationLogService.log({
    actorId: null,
    action: "anchor.pr.auto_create",
    aggregateType: "partner_request",
    aggregateId: String(created.id),
    detail: {
      sourcePrId: prId,
      batchId: created.batchId,
      location: created.location,
    },
  });
}
