import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../../entities/partner-request";
import type { User, UserId } from "../../../../entities/user";
import { UserRepository } from "../../../../repositories/UserRepository";
import {
  createLocalUserWithGeneratedPin,
  ensureUserHasPin,
  resolveUserByOpenId,
} from "../../../user";
import { joinPRAsUser } from "../../../pr-core/use-cases/join-pr";
import type { PublicPR } from "../../read-models/public-pr-view.service";

const userRepo = new UserRepository();

export type PRParticipantIdentityInput = {
  authenticatedUserId: UserId | null;
  oauthOpenId: string | null;
};

export type JoinPRByIdentityResult = {
  pr: PublicPR;
  userId: UserId;
  generatedUserPin: string | null;
};

const resolveParticipantUser = async (
  input: PRParticipantIdentityInput,
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

export async function joinPRByIdentity(
  id: PRId,
  identity: PRParticipantIdentityInput,
  options: {
    bookingContactPhone?: string | null;
  } = {},
): Promise<JoinPRByIdentityResult> {
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
