import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities/partner-request";
import type { User, UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import {
  createLocalUserWithGeneratedPin,
  ensureUserHasPin,
  resolveUserByOpenId,
} from "../../user";
import { joinPRAsUser, type PublicPR } from "../../pr-core";

const userRepo = new UserRepository();

type ParticipantIdentityInput = {
  authenticatedUserId: UserId | null;
  oauthOpenId: string | null;
};

export type JoinCommunityPRResult = {
  pr: PublicPR;
  userId: UserId;
  generatedUserPin: string | null;
};

const resolveParticipantUser = async (
  input: ParticipantIdentityInput,
): Promise<{ user: User; generatedUserPin: string | null }> => {
  if (input.authenticatedUserId) {
    const user = await userRepo.findById(input.authenticatedUserId);
    if (!user) {
      throw new HTTPException(401, { message: "Invalid authenticated user" });
    }

    const ensured = await ensureUserHasPin(user);
    return {
      user: ensured.user,
      generatedUserPin: ensured.userPin,
    };
  }

  if (input.oauthOpenId) {
    const user = await resolveUserByOpenId(input.oauthOpenId);
    const ensured = await ensureUserHasPin(user);
    return {
      user: ensured.user,
      generatedUserPin: ensured.userPin,
    };
  }

  const local = await createLocalUserWithGeneratedPin();
  return {
    user: local.user,
    generatedUserPin: local.userPin,
  };
};

export async function joinCommunityPR(
  id: PRId,
  identity: ParticipantIdentityInput,
  options: {
    bookingContactPhone?: string | null;
  } = {},
): Promise<JoinCommunityPRResult> {
  const participant = await resolveParticipantUser(identity);
  const pr = await joinPRAsUser(id, participant.user, {
    bookingContactPhone: options.bookingContactPhone ?? null,
  });

  return {
    pr,
    userId: participant.user.id,
    generatedUserPin: participant.generatedUserPin,
  };
}
