import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { CommunityPRRepository } from "../../../repositories/CommunityPRRepository";
import type {
  PartnerRequestFields,
} from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  assertPartnerBoundsValid,
  initializeSlotsForPR,
} from "../services/slot-management.service";
import {
  resolveDraftCreator,
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const communityPRRepo = new CommunityPRRepository();

function buildStructuredFallbackRawText(fields: PartnerRequestFields): string {
  const parts: string[] = [];
  if (fields.title?.trim()) parts.push(fields.title.trim());
  parts.push(`类型:${fields.type}`);
  if (fields.location?.trim()) parts.push(`地点:${fields.location.trim()}`);
  const [start, end] = fields.time;
  if (start || end) parts.push(`时间:${start ?? "待定"}-${end ?? "待定"}`);
  return parts.join(" | ");
}

export type CreatePRResult = {
  id: number;
  createdBy: UserId | null;
};

export async function createPRFromStructured(
  fields: PartnerRequestFields,
  creatorIdentity: CreatorIdentityInput,
): Promise<CreatePRResult> {
  assertPartnerBoundsValid(fields.minPartners, fields.maxPartners, 0);

  const creator = await resolveDraftCreator(creatorIdentity);
  const createdBy = creator?.id ?? null;

  const rawText = buildStructuredFallbackRawText(fields);
  const request = await prRepo.create({
    title: fields.title,
    type: fields.type,
    time: fields.time,
    location: fields.location,
    minPartners: fields.minPartners,
    maxPartners: fields.maxPartners,
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
    creationSource: "STRUCTURED",
  });

  await initializeSlotsForPR(
    request.id,
    "COMMUNITY",
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
      source: "structured",
      status: "DRAFT",
      creatorOpenId: creatorIdentity.oauthOpenId,
    },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: createdBy,
    action: "pr.create_structured",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: { status: "DRAFT" },
  });

  return {
    id: request.id,
    createdBy,
  };
}
