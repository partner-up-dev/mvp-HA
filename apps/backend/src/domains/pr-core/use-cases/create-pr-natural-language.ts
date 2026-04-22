import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { CommunityPRRepository } from "../../../repositories/CommunityPRRepository";
import { PartnerRequestAIService } from "../../../services/PartnerRequestAIService";
import type {
  WeekdayLabel,
} from "../../../entities/partner-request";
import {
  initializeSlotsForPR,
} from "../services/slot-management.service";
import { normalizeAutomaticPartnerBounds } from "../services/partner-bounds.service";
import {
  resolveDraftCreator,
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import {
  finalizeCreatedPR,
  type CreatePRCommandResult,
} from "./create-pr.shared";

const prRepo = new PartnerRequestRepository();
const communityPRRepo = new CommunityPRRepository();
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

  const creator = await resolveDraftCreator(creatorIdentity);
  const createdBy = creator?.id ?? null;

  const request = await prRepo.create({
    title: fields.title,
    type: fields.type,
    time: fields.time,
    location: fields.location,
    minPartners: partnerBounds.minPartners,
    maxPartners: partnerBounds.maxPartners,
    preferences: fields.preferences,
    notes: fields.notes,
    status: "DRAFT",
    createdBy,
    prKind: "COMMUNITY",
  });
  await communityPRRepo.create({
    prId: request.id,
    rawText,
    budget: fields.budget,
    creationSource: "NATURAL_LANGUAGE",
  });

  await initializeSlotsForPR(
    request.id,
    null,
  );

  const event = await eventBus.publish(
    "pr.created",
    "partner_request",
    String(request.id),
    {
      prId: request.id,
      source: "natural_language",
      status: "DRAFT",
      creatorOpenId: creatorIdentity.oauthOpenId,
    },
  );
  void writeToOutbox(event);

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
