import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../../entities/partner-request";
import type { User, UserId } from "../../../../entities/user";
import { UserRepository } from "../../../../repositories/UserRepository";
import { resolveUserByOpenId } from "../../../user";
import { joinPRAsUser } from "../../../pr-core/use-cases/join-pr";
import { waitlistPRAsUser } from "../../../pr-core/use-cases/waitlist-pr";
import type { PublicPR } from "../../read-models/public-pr-view.service";

const userRepo = new UserRepository();

export type PRParticipantIdentityInput = {
  authenticatedUserId: UserId | null;
  anonymousUserId: UserId | null;
  oauthOpenId: string | null;
};

export type JoinPRByIdentityResult = {
  pr: PublicPR;
  userId: UserId;
};

export type WaitlistPRByIdentityResult = {
  pr: PublicPR;
  userId: UserId;
};

export const resolvePRParticipantUser = async (
  input: PRParticipantIdentityInput,
): Promise<{ user: User }> => {
  if (input.authenticatedUserId) {
    const user = await userRepo.findById(input.authenticatedUserId);
    if (!user || user.status !== "ACTIVE") {
      throw new HTTPException(401, { message: "Invalid authenticated user" });
    }

    return {
      user,
    };
  }

  if (input.oauthOpenId) {
    const user = await resolveUserByOpenId(input.oauthOpenId);
    return {
      user,
    };
  }

  if (!input.anonymousUserId) {
    throw new HTTPException(401, { message: "Session required" });
  }

  const anonymous = await userRepo.findById(input.anonymousUserId);
  if (
    !anonymous ||
    anonymous.status !== "ACTIVE" ||
    anonymous.role !== "anonymous"
  ) {
    throw new HTTPException(401, { message: "Invalid anonymous user session" });
  }

  return {
    user: anonymous,
  };
};

export async function joinPRByIdentity(
  id: PRId,
  identity: PRParticipantIdentityInput,
  options: {
    bookingContactPhone?: string | null;
  } = {},
): Promise<JoinPRByIdentityResult> {
  const participant = await resolvePRParticipantUser(identity);
  const pr = await joinPRAsUser(id, participant.user, {
    bookingContactPhone: options.bookingContactPhone ?? null,
  });

  return {
    pr,
    userId: participant.user.id,
  };
}

export async function waitlistPRByIdentity(
  id: PRId,
  identity: PRParticipantIdentityInput,
  options: {
    alternativePrReminderOptIn?: boolean;
  } = {},
): Promise<WaitlistPRByIdentityResult> {
  const participant = await resolvePRParticipantUser(identity);
  const pr = await waitlistPRAsUser(id, participant.user, {
    alternativePrReminderOptIn: options.alternativePrReminderOptIn,
  });

  return {
    pr,
    userId: participant.user.id,
  };
}
