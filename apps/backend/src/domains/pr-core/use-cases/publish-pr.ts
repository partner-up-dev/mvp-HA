import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import {
  resolvePublishedCreator,
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import { ensureUserHasPin, resolveUserByOpenId } from "../../user";
import { recalculatePRStatus } from "../services/slot-management.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();

export type PublishPRResult = {
  pr: PublicPR;
  createdBy: UserId;
  generatedUserPin: string | null;
};

const ensureCreatorSlotJoined = async (prId: PRId, creatorUserId: UserId) => {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const existing = await partnerRepo.findActiveByPrIdAndUserId(prId, creatorUserId);
  if (existing) {
    return;
  }

  const targetStatus = "JOINED";
  const created = await partnerRepo.createSlot({
    prId,
    userId: creatorUserId,
    status: targetStatus,
  });
  if (!created) {
    throw new HTTPException(500, {
      message: "Failed to create creator partner slot",
    });
  }

  await recalculatePRStatus(prId);
};

export async function publishPR(
  id: PRId,
  creatorIdentity: CreatorIdentityInput,
): Promise<PublishPRResult> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  if (request.status !== "DRAFT") {
    throw new HTTPException(400, {
      message: "Only DRAFT partner requests can be published",
    });
  }

  let creatorUserId: UserId;
  let generatedUserPin: string | null = null;

  if (request.createdBy) {
    if (creatorIdentity.authenticatedUserId) {
      if (creatorIdentity.authenticatedUserId !== request.createdBy) {
        throw new HTTPException(403, {
          message: "Only the draft creator can publish this partner request",
        });
      }
      const user = await userRepo.findById(request.createdBy);
      if (!user) {
        throw new HTTPException(404, { message: "Draft creator user not found" });
      }
      const ensured = await ensureUserHasPin(user);
      creatorUserId = ensured.user.id;
      generatedUserPin = ensured.userPin;
    } else if (creatorIdentity.oauthOpenId) {
      const oauthUser = await resolveUserByOpenId(creatorIdentity.oauthOpenId);
      if (oauthUser.id !== request.createdBy) {
        throw new HTTPException(403, {
          message: "Only the draft creator can publish this partner request",
        });
      }
      const ensured = await ensureUserHasPin(oauthUser);
      creatorUserId = ensured.user.id;
      generatedUserPin = ensured.userPin;
    } else {
      throw new HTTPException(401, {
        message: "Authentication required to publish claimed draft",
      });
    }
  } else {
    const creator = await resolvePublishedCreator(creatorIdentity);
    creatorUserId = creator.user.id;
    generatedUserPin = creator.generatedUserPin;
    await prRepo.setCreatedBy(id, creatorUserId);
  }

  await assertNoUserTimeWindowConflict({
    userId: creatorUserId,
    targetTimeWindow: request.time,
    excludePrId: id,
  });
  await assertPRTimeWindowAvailableAtLocation({
    location: request.location,
    timeWindow: request.time,
  });

  const updated = await prRepo.updateStatus(id, "OPEN");
  if (!updated) {
    throw new HTTPException(500, { message: "Failed to publish partner request" });
  }

  await ensureCreatorSlotJoined(id, creatorUserId);

  const latest = await prRepo.findById(id);
  if (!latest) {
    throw new HTTPException(500, { message: "Failed to reload partner request" });
  }

  const event = await eventBus.publish(
    "pr.status_changed",
    "partner_request",
    String(id),
    {
      prId: id,
      fromStatus: "DRAFT",
      toStatus: latest.status,
      trigger: "manual",
    },
  );
  void writeToOutbox(event);

  operationLogService.log({
    actorId: creatorUserId,
    action: "pr.publish",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { fromStatus: "DRAFT", toStatus: latest.status },
  });

  return {
    pr: await toPublicPR(latest, creatorUserId),
    createdBy: creatorUserId,
    generatedUserPin,
  };
}
