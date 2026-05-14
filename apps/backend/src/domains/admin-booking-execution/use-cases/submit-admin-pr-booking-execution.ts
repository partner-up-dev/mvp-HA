import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId, UserId } from "../../../entities";
import { operationLogService } from "../../../infra/operation-log";
import { PRBookingExecutionRepository } from "../../../repositories/PRBookingExecutionRepository";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import { PRSupportResourceRepository } from "../../../repositories/PRSupportResourceRepository";
import {
  isPlatformHandledBookingResource,
  resolveBookingContactState,
} from "../../pr-booking-support";
import {
  type BookingResultNotificationSummary,
  sendBookingResultNotifications,
} from "../services/send-booking-result-notifications";

const eventContextRepo = new AnchorEventPRContextRepository();
const prSupportRepo = new PRSupportResourceRepository();
const bookingExecutionRepo = new PRBookingExecutionRepository();

const normalizeOptionalReason = (
  value: string | null | undefined,
): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export async function submitAdminPRBookingExecution(input: {
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
  const record = await eventContextRepo.findRecordByPrId(input.prId);
  if (!record) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }

  const existingExecution = await bookingExecutionRepo.findByPrId(input.prId);
  if (existingExecution) {
    return throwHttpProblem({ status: 409, detail: "Booking execution already recorded for this PR" });
  }

  const normalizedReason = normalizeOptionalReason(input.reason);
  if (input.result === "FAILED" && !normalizedReason) {
    return throwHttpProblem({ status: 400, detail: "Failure reason is required" });
  }

  const resources = await prSupportRepo.findByPrId(input.prId);
  const targetResource =
    resources.find((resource) => resource.id === input.targetResourceId) ?? null;
  if (!targetResource || !isPlatformHandledBookingResource(targetResource)) {
    return throwHttpProblem({ status: 400, detail: "Target resource is not a platform-handled booking resource" });
  }

  const bookingContact = await resolveBookingContactState({
    prId: input.prId,
    viewerUserId: null,
    supportResources: resources,
  });

  const createdExecution = await bookingExecutionRepo.create({
    prId: input.prId,
    targetResourceId: targetResource.id,
    targetResourceTitle: targetResource.title,
    bookingContactPhone: bookingContact.fullPhone,
    actorUserId: input.actorUserId,
    result: input.result,
    reason: normalizedReason,
    notificationTargetCount: 0,
    notificationSuccessCount: 0,
    notificationFailureCount: 0,
    notificationSkippedCount: 0,
  });

  if (!createdExecution) {
    return throwHttpProblem({ status: 500, detail: "Failed to record booking execution" });
  }

  let notificationSummary: BookingResultNotificationSummary;
  try {
    notificationSummary = await sendBookingResultNotifications({
      executionId: createdExecution.id,
      prId: input.prId,
      prTimeWindow: record.root.time,
      location: record.root.location,
      resourceTitle: targetResource.title,
      resourceSummaryText: targetResource.summaryText,
      resourceDetailRules: [...targetResource.detailRules],
      result: input.result,
      reason: normalizedReason,
    });

    await bookingExecutionRepo.updateNotificationSummary(
      createdExecution.id,
      notificationSummary,
    );
  } catch (error) {
    await bookingExecutionRepo.deleteById(createdExecution.id);
    throw error;
  }

  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.booking_execution_submitted",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      targetResourceId: targetResource.id,
      targetResourceTitle: targetResource.title,
      bookingContactPhone: bookingContact.fullPhone,
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
