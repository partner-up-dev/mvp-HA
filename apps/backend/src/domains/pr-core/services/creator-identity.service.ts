import { HTTPException } from "hono/http-exception";
import type { User, UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import {
  createLocalUserWithGeneratedPin,
  ensureUserHasPin,
  resolveUserByOpenId,
} from "../../user";

const userRepo = new UserRepository();

export type CreatorIdentityInput = {
  authenticatedUserId: UserId | null;
  oauthOpenId: string | null;
};

export type CreatorIdentityResult = {
  user: User;
  generatedUserPin: string | null;
  source: "authenticated" | "wechat" | "local";
};

export async function resolveDraftCreator(
  input: CreatorIdentityInput,
): Promise<User | null> {
  if (input.authenticatedUserId) {
    const user = await userRepo.findById(input.authenticatedUserId);
    if (!user) {
      throw new HTTPException(401, { message: "Invalid authenticated user" });
    }
    return user;
  }

  if (input.oauthOpenId) {
    return resolveUserByOpenId(input.oauthOpenId);
  }

  return null;
}

export async function resolvePublishedCreator(
  input: CreatorIdentityInput,
): Promise<CreatorIdentityResult> {
  if (input.authenticatedUserId) {
    const user = await userRepo.findById(input.authenticatedUserId);
    if (!user) {
      throw new HTTPException(401, { message: "Invalid authenticated user" });
    }

    const ensured = await ensureUserHasPin(user);
    return {
      user: ensured.user,
      generatedUserPin: ensured.userPin,
      source: "authenticated",
    };
  }

  if (input.oauthOpenId) {
    const user = await resolveUserByOpenId(input.oauthOpenId);
    const ensured = await ensureUserHasPin(user);
    return {
      user: ensured.user,
      generatedUserPin: ensured.userPin,
      source: "wechat",
    };
  }

  const local = await createLocalUserWithGeneratedPin();
  return {
    user: local.user,
    generatedUserPin: local.userPin,
    source: "local",
  };
}
