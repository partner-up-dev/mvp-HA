import { randomUUID } from "crypto";
import { issueAnonymousAuth } from "../../../auth/middleware";
import { UserRepository } from "../../../repositories/UserRepository";
import type { UserId } from "../../../entities/user";

export type AnonymousRegistrationResult = {
  role: "anonymous";
  userId: string;
  userPin: null;
  accessToken: string;
};

const userRepo = new UserRepository();

const generateUserId = (): UserId => randomUUID() as UserId;

export async function registerAnonymousUser(): Promise<AnonymousRegistrationResult> {
  const created = await userRepo.create({
    id: generateUserId(),
    openId: null,
    pinHash: null,
    role: "anonymous",
    status: "ACTIVE",
  });

  if (!created) {
    throw new Error("Failed to create anonymous user");
  }

  const auth = issueAnonymousAuth(created.id);

  return {
    role: "anonymous",
    userId: created.id,
    userPin: null,
    accessToken: auth.token,
  };
}
