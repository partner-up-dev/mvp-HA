import { HTTPException } from "hono/http-exception";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId } from "../../../entities/partner-request";
import type { User } from "../../../entities/user";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { countActivePartnersForPR } from "../services/slot-management.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";
import { assertPRJoinGatesResolvedForUser } from "../services/join-gates.service";
import { isWaitlistOpenForRequest } from "../services/waitlist.service";
import { scheduleAlternativeWaitlistNotificationsForSource } from "../services/waitlist-alternative-reminder.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export async function waitlistPRAsUser(
  id: PRId,
  user: Pick<User, "id" | "status">,
  options: { alternativePrReminderOptIn?: boolean } = {},
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  if (user.status !== "ACTIVE") {
    throw new HTTPException(403, { message: "Current user is not active" });
  }

  const existingActive = await partnerRepo.findActiveByPrIdAndUserId(
    id,
    user.id,
  );
  if (existingActive) {
    const latest = await prRepo.findById(id);
    if (!latest) {
      throw new HTTPException(500, {
        message: "Failed to reload partner request",
      });
    }
    return toPublicPR(latest, user.id);
  }

  const existingPending = await partnerRepo.findPendingByPrIdAndUserId(
    id,
    user.id,
  );
  if (existingPending) {
    const latest = await prRepo.findById(id);
    if (!latest) {
      throw new HTTPException(500, {
        message: "Failed to reload partner request",
      });
    }
    return toPublicPR(latest, user.id);
  }

  await assertNoUserTimeWindowConflict({
    userId: user.id,
    targetTimeWindow: refreshedRequest.time,
    excludePrId: id,
  });
  await assertPRJoinGatesResolvedForUser({
    prId: id,
    userId: user.id,
  });

  const activeCount = await countActivePartnersForPR(id);
  if (
    !isWaitlistOpenForRequest({
      request: refreshedRequest,
      activeCount,
    })
  ) {
    throw new HTTPException(400, {
      message: "Cannot waitlist - partner request is not full",
    });
  }

  const latestHistoricalSlot =
    await partnerRepo.findReusableInactiveByPrIdAndUserId(id, user.id);
  const pendingSlot = latestHistoricalSlot
    ? await partnerRepo.markPending(latestHistoricalSlot.id, {
        alternativePrReminderOptIn: options.alternativePrReminderOptIn,
      })
    : await partnerRepo.createSlot({
        prId: id,
        userId: user.id,
        status: "PENDING",
        alternativePrReminderOptIn: options.alternativePrReminderOptIn,
      });
  if (!pendingSlot) {
    throw new HTTPException(500, {
      message: "Failed to persist waitlist participation record",
    });
  }

  operationLogService.log({
    actorId: user.id,
    action: "partner.waitlist_join",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: {
      partnerId: pendingSlot.id,
      alternativePrReminderOptIn:
        options.alternativePrReminderOptIn === true,
    },
  });

  if (options.alternativePrReminderOptIn === true) {
    await scheduleAlternativeWaitlistNotificationsForSource({
      sourceRequest: refreshedRequest,
      sourcePartnerId: pendingSlot.id,
      recipientUserId: user.id,
    });
  }

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, {
      message: "Failed to reload partner request",
    });
  }
  return toPublicPR(latest, user.id);
}
