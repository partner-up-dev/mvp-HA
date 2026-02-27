import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRequestAIService } from "../../../services/PartnerRequestAIService";
import type {
  PartnerRequestFields,
  WeekdayLabel,
} from "../../../entities/partner-request";
import {
  assertPartnerBoundsValid,
  initializeSlotsForPR,
} from "../services/slot-management.service";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const aiService = new PartnerRequestAIService();

export async function createPRFromNaturalLanguage(
  rawText: string,
  pin: string,
  nowIso: string,
  nowWeekday: WeekdayLabel | null,
  creatorOpenId?: string | null,
): Promise<{ id: number }> {
  if (!/^\d{4}$/.test(pin)) {
    throw new HTTPException(400, { message: "PIN must be exactly 4 digits" });
  }

  const fields = await aiService.parseRequest(rawText, nowIso, nowWeekday);
  assertPartnerBoundsValid(fields.minPartners, fields.maxPartners, 0);

  const pinHash = await bcrypt.hash(pin, 10);
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
    status: "OPEN",
  });

  const creatorUserId = creatorOpenId
    ? (await resolveUserByOpenId(creatorOpenId)).id
    : null;

  await initializeSlotsForPR(
    request.id,
    fields.minPartners,
    fields.maxPartners,
    creatorUserId,
    fields.time,
  );

  // Emit domain event
  const event = await eventBus.publish(
    "pr.created",
    "partner_request",
    String(request.id),
    {
      prId: request.id,
      source: "natural_language",
      status: "OPEN",
      creatorOpenId: creatorOpenId ?? null,
    },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: creatorOpenId ?? null,
    action: "pr.create_from_nl",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: { rawText },
  });

  return { id: request.id };
}
