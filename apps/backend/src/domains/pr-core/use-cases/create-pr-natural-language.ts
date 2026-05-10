import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRequestAIService } from "../../../services/PartnerRequestAIService";
import type {
  WeekdayLabel,
} from "../../../entities/partner-request";
import {
  initializeSlotsForPR,
} from "../services/slot-management.service";
import { normalizeAutomaticPartnerBounds } from "../services/partner-bounds.service";
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
const aiService = new PartnerRequestAIService();

export async function createPRFromNaturalLanguage(
  rawText: string,
  nowIso: string,
  nowWeekday: WeekdayLabel | null,
  creatorIdentity: CreatorIdentityInput,
): Promise<CreatePRCommandResult> {
  const fields = await aiService.parseRequest(rawText, nowIso, nowWeekday);
  const partnerBounds = normalizeAutomaticPartnerBounds(
    fields.minPartners,
    fields.maxPartners,
    0,
  );
  await assertPRTimeWindowAvailableAtLocation({
    location: fields.location,
    timeWindow: fields.time,
  });

  const creator = await resolveDraftCreator(creatorIdentity);
  const createdBy = creator?.id ?? null;

  const request = await prRepo.create({
    title: fields.title,
    type: fields.type,
    time: fields.time,
    location: fields.location,
    minPartners: partnerBounds.minPartners,
    maxPartners: partnerBounds.maxPartners,
    budget: fields.budget,
    preferences: fields.preferences,
    notes: fields.notes,
    meetingPoint: fields.meetingPoint ?? null,
    status: "DRAFT",
    createdBy,
  });

  await initializeSlotsForPR(
    request.id,
    null,
  );

  await materializeEventDefaultsForPR({
    prId: request.id,
    type: request.type,
    location: request.location,
    timeWindow: request.time,
  });

  operationLogService.log({
    actorId: createdBy,
    action: "pr.create_from_nl",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: { rawText, status: "DRAFT" },
  });

  return finalizeCreatedPR({
    id: request.id,
    createdBy,
    creatorIdentity,
  });
}
