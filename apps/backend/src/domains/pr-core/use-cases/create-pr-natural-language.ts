import bcrypt from "bcryptjs";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRequestAIService } from "../../../services/PartnerRequestAIService";
import type {
  WeekdayLabel,
} from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  assertPartnerBoundsValid,
  initializeSlotsForPR,
} from "../services/slot-management.service";
import { resolveCommunityEconomicPolicy } from "../services/economic-policy.service";
import {
  resolveDraftCreator,
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const aiService = new PartnerRequestAIService();

const generateLegacyPin = (): string =>
  String(Math.floor(Math.random() * 10_000)).padStart(4, "0");

export type CreatePRFromNLResult = {
  id: number;
  createdBy: UserId | null;
};

export async function createPRFromNaturalLanguage(
  rawText: string,
  nowIso: string,
  nowWeekday: WeekdayLabel | null,
  creatorIdentity: CreatorIdentityInput,
): Promise<CreatePRFromNLResult> {
  const fields = await aiService.parseRequest(rawText, nowIso, nowWeekday);
  assertPartnerBoundsValid(fields.minPartners, fields.maxPartners, 0);

  const creator = await resolveDraftCreator(creatorIdentity);
  const createdBy = creator?.id ?? null;

  const pinHash = await bcrypt.hash(generateLegacyPin(), 10);
  const economicPolicy = resolveCommunityEconomicPolicy();
  const request = await prRepo.create({
    rawText,
    title: fields.title,
    type: fields.type,
    time: fields.time,
    location: fields.location,
    minPartners: fields.minPartners,
    maxPartners: fields.maxPartners,
    pinHash,
    budget: fields.budget,
    preferences: fields.preferences,
    notes: fields.notes,
    status: "DRAFT",
    createdBy,
    resourceBookingDeadlineAt: economicPolicy.resourceBookingDeadlineAt,
    paymentModelApplied: economicPolicy.paymentModelApplied,
    discountRateApplied: economicPolicy.discountRateApplied,
    subsidyCapApplied: economicPolicy.subsidyCapApplied,
    cancellationPolicyApplied: economicPolicy.cancellationPolicyApplied,
    economicPolicyScopeApplied: economicPolicy.economicPolicyScopeApplied,
    economicPolicyVersionApplied: economicPolicy.economicPolicyVersionApplied,
  });

  await initializeSlotsForPR(
    request.id,
    fields.minPartners,
    fields.maxPartners,
    null,
    fields.time,
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

  return {
    id: request.id,
    createdBy,
  };
}
