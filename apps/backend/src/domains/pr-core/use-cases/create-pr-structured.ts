import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type {
  AnchorEventId,
  PRJoinGateConfig,
} from "../../../entities";
import type {
  PartnerRequestFields,
} from "../../../entities/partner-request";
import { initializeSlotsForPR } from "../services/slot-management.service";
import { assertManualPartnerBoundsValid } from "../services/partner-bounds.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import {
  resolveDraftCreator,
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import { operationLogService } from "../../../infra/operation-log";
import {
  finalizeCreatedPR,
  type CreatePRCommandResult,
} from "./create-pr.shared";
import { materializeEventDefaultsForPR } from "../services/event-default-materialization.service";

const prRepo = new PartnerRequestRepository();

export type StructuredCreateSource = "FORM" | "EVENT_ASSISTED";

export async function createPRFromStructured(
  fields: PartnerRequestFields,
  creatorIdentity: CreatorIdentityInput,
  options: {
    anchorEventId?: AnchorEventId;
    createSource?: StructuredCreateSource;
    joinGateConfig?: PRJoinGateConfig;
  } = {},
): Promise<CreatePRCommandResult> {
  assertManualPartnerBoundsValid(fields.minPartners, fields.maxPartners, 0);
  await assertPRTimeWindowAvailableAtLocation({
    location: fields.location,
    timeWindow: fields.time,
  });

  const creator = await resolveDraftCreator(creatorIdentity);
  const createdBy = creator?.id ?? null;
  const createSource = options.createSource ?? "FORM";

  const request = await prRepo.create({
    title: fields.title,
    type: fields.type,
    time: fields.time,
    location: fields.location,
    minPartners: fields.minPartners,
    maxPartners: fields.maxPartners,
    budget: fields.budget,
    preferences: fields.preferences,
    notes: fields.notes,
    meetingPoint: fields.meetingPoint ?? null,
    joinGateConfig: options.joinGateConfig ?? [],
    status: "DRAFT",
    createdBy,
  });

  await initializeSlotsForPR(
    request.id,
    null,
  );

  await materializeEventDefaultsForPR({
    prId: request.id,
    anchorEventId: options.anchorEventId,
    type: request.type,
    location: request.location,
    timeWindow: request.time,
    prNotes: request.notes,
    prJoinGateConfig: options.joinGateConfig,
  });

  operationLogService.log({
    actorId: createdBy,
    action:
      createSource === "EVENT_ASSISTED"
        ? "pr.create_event_assisted"
        : "pr.create_structured",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: {
      source: createSource,
      status: "DRAFT",
    },
  });

  return finalizeCreatedPR({
    id: request.id,
    createdBy,
    creatorIdentity,
  });
}
