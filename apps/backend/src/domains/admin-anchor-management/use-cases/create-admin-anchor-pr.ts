import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { initializeSlotsForPR } from "../../pr-core/services/slot-management.service";
import { materializePRSupportResources } from "../../pr-booking-support";
import { normalizeLocationPool } from "../../../entities/anchor-event";
import type {
  AnchorPartnerRequest,
  AnchorEventBatchId,
  PartnerRequest,
} from "../../../entities";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const anchorPRRepo = new AnchorPRRepository();

export interface CreateAdminAnchorPRInput {
  title: string | null;
  type: string | null;
  location: string;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
}

export interface CreateAdminAnchorPROutput {
  root: PartnerRequest;
  anchor: AnchorPartnerRequest;
}

export async function createAdminAnchorPR(
  batchId: AnchorEventBatchId,
  input: CreateAdminAnchorPRInput,
): Promise<CreateAdminAnchorPROutput> {
  const batch = await batchRepo.findById(batchId);
  if (!batch) {
    throw new HTTPException(404, { message: "Anchor event batch not found" });
  }

  const event = await anchorEventRepo.findById(batch.anchorEventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const normalizedLocationPool = normalizeLocationPool(event.locationPool);
  if (!normalizedLocationPool.includes(input.location)) {
    throw new HTTPException(400, {
      message: "Anchor PR location must belong to the anchor event location pool",
    });
  }

  const createdRoot = await prRepo.create({
    title: input.title,
    type: input.type?.trim() || event.type,
    time: batch.timeWindow,
    location: input.location,
    status: "OPEN",
    minPartners: input.minPartners,
    maxPartners: input.maxPartners,
    preferences: input.preferences,
    notes: input.notes,
    prKind: "ANCHOR",
  });

  const createdAnchor = await anchorPRRepo.create({
    prId: createdRoot.id,
    anchorEventId: event.id,
    batchId: batch.id,
    visibilityStatus: "VISIBLE",
    autoHideAt: null,
  });

  await initializeSlotsForPR(
    createdRoot.id,
    "ANCHOR",
    createdRoot.minPartners,
    createdRoot.maxPartners,
    null,
    createdRoot.time,
  );

  await materializePRSupportResources({
    prId: createdRoot.id,
    anchorEventId: event.id,
    batchId: batch.id,
    location: createdRoot.location,
    timeWindow: createdRoot.time,
  });

  return {
    root: createdRoot,
    anchor: createdAnchor,
  };
}
