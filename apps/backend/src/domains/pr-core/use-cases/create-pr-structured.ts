import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type {
  PartnerRequestFields,
  CreatePRStructuredStatus,
} from "../../../entities/partner-request";
import {
  assertPartnerBoundsValid,
  initializeSlotsForPR,
} from "../services/slot-management.service";
import { resolveUserByOpenId } from "../services/user-resolver.service";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();

function buildStructuredFallbackRawText(fields: PartnerRequestFields): string {
  const parts: string[] = [];
  if (fields.title?.trim()) parts.push(fields.title.trim());
  parts.push(`类型:${fields.type}`);
  if (fields.location?.trim()) parts.push(`地点:${fields.location.trim()}`);
  const [start, end] = fields.time;
  if (start || end) parts.push(`时间:${start ?? "待定"}-${end ?? "待定"}`);
  return parts.join(" | ");
}

export async function createPRFromStructured(
  fields: PartnerRequestFields,
  pin: string,
  status: CreatePRStructuredStatus,
  creatorOpenId?: string | null,
): Promise<{ id: number }> {
  if (!/^\d{4}$/.test(pin)) {
    throw new HTTPException(400, { message: "PIN must be exactly 4 digits" });
  }

  assertPartnerBoundsValid(fields.minPartners, fields.maxPartners, 0);

  const pinHash = await bcrypt.hash(pin, 10);
  const request = await prRepo.create({
    rawText: buildStructuredFallbackRawText(fields),
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
    status,
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
      source: "structured",
      status,
      creatorOpenId: creatorOpenId ?? null,
    },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: creatorOpenId ?? null,
    action: "pr.create_structured",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    detail: { status },
  });

  return { id: request.id };
}
