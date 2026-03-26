import { HTTPException } from "hono/http-exception";
import type { PRId, UserId } from "../../../entities";
import { operationLogService } from "../../../infra/operation-log";
import { AnchorPRBookingContactRepository } from "../../../repositories/AnchorPRBookingContactRepository";
import { AnchorPRBookingExecutionRepository } from "../../../repositories/AnchorPRBookingExecutionRepository";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import {
  type BookingResultNotificationSummary,
  sendBookingResultNotifications,
} from "../services/send-booking-result-notifications";

const anchorPRRepo = new AnchorPRRepository();
const bookingContactRepo = new AnchorPRBookingContactRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();
const bookingExecutionRepo = new AnchorPRBookingExecutionRepository();

const normalizeOptionalReason = (
  value: string | null | undefined,
): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export async function submitAdminAnchorPRBookingExecution(input: {
  prId: PRId;
  targetResourceId: number;
  result: "SUCCESS" | "FAILED";
  reason: string | null;
  actorUserId: UserId;
}): Promise<{
  ok: true;
  prId: PRId;
  result: "SUCCESS" | "FAILED";
  reason: string | null;
  targetResourceId: number;
  targetResourceTitle: string;
  notificationSummary: BookingResultNotificationSummary;
}> {
  const record = await anchorPRRepo.findRecordByPrId(input.prId);
  if (!record || record.root.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  const existingExecution = await bookingExecutionRepo.findByPrId(input.prId);
  if (existingExecution) {
    throw new HTTPException(409, {
      message: "Booking execution already recorded for this Anchor PR",
    });
  }

  const normalizedReason = normalizeOptionalReason(input.reason);
  if (input.result === "FAILED" && !normalizedReason) {
    throw new HTTPException(400, {
      message: "Failure reason is required",
    });
  }

  const resources = await prSupportRepo.findByPrId(input.prId);
  const targetResource =
    resources.find((resource) => resource.id === input.targetResourceId) ?? null;
  if (
    !targetResource ||
    !targetResource.bookingRequired ||
    targetResource.bookingHandledBy !== "PLATFORM"
  ) {
    throw new HTTPException(400, {
      message: "Target resource is not a platform-handled booking resource",
    });
  }

  const notificationSummary = await sendBookingResultNotifications({
    prId: input.prId,
    prTitle:
      record.root.title?.trim() || record.root.type || `活动 #${record.root.id}`,
    resourceTitle: targetResource.title,
    result: input.result,
    reason: normalizedReason,
  });
  const bookingContact = await bookingContactRepo.findByPrId(input.prId);

  const createdExecution = await bookingExecutionRepo.create({
    prId: input.prId,
    targetResourceId: targetResource.id,
    targetResourceTitle: targetResource.title,
    bookingContactPhone: bookingContact?.phoneE164 ?? null,
    actorUserId: input.actorUserId,
    result: input.result,
    reason: normalizedReason,
    notificationTargetCount: notificationSummary.targetCount,
    notificationSuccessCount: notificationSummary.successCount,
    notificationFailureCount: notificationSummary.failureCount,
    notificationSkippedCount: notificationSummary.skippedCount,
  });

  if (!createdExecution) {
    throw new HTTPException(500, {
      message: "Failed to record booking execution",
    });
  }

  operationLogService.log({
    actorId: input.actorUserId,
    action: "anchor.pr.booking_execution_submitted",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      targetResourceId: targetResource.id,
      targetResourceTitle: targetResource.title,
      bookingContactPhone: bookingContact?.phoneE164 ?? null,
      result: input.result,
      reason: normalizedReason,
      notificationTargetCount: notificationSummary.targetCount,
      notificationSuccessCount: notificationSummary.successCount,
      notificationFailureCount: notificationSummary.failureCount,
      notificationSkippedCount: notificationSummary.skippedCount,
    },
  });

  return {
    ok: true,
    prId: input.prId,
    result: input.result,
    reason: normalizedReason,
    targetResourceId: targetResource.id,
    targetResourceTitle: targetResource.title,
    notificationSummary,
  };
}
