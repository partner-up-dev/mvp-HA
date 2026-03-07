import { randomUUID, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import type { User, UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";

const userRepo = new UserRepository();

const generateLocalUserId = (): UserId => randomUUID() as UserId;

const generateUserPin = (): string =>
  String(randomInt(0, 10_000)).padStart(4, "0");

export type EnsuredUserPinResult = {
  user: User;
  userPin: string | null;
};

export async function createLocalUserWithGeneratedPin(): Promise<{
  user: User;
  userPin: string;
}> {
  const pin = generateUserPin();
  const pinHash = await bcrypt.hash(pin, 10);

  const created = await userRepo.create({
    id: generateLocalUserId(),
    openId: null,
    pinHash,
    status: "ACTIVE",
  });

  if (!created) {
    throw new Error("Failed to create local user");
  }

  return {
    user: created,
    userPin: pin,
  };
}

export async function ensureUserHasPin(user: User): Promise<EnsuredUserPinResult> {
  if (user.pinHash) {
    return {
      user,
      userPin: null,
    };
  }

  const pin = generateUserPin();
  const pinHash = await bcrypt.hash(pin, 10);
  const updated = await userRepo.updatePinHash(user.id, pinHash);
  if (!updated) {
    throw new Error("Failed to set user pin");
  }

  return {
    user: updated,
    userPin: pin,
  };
}

export async function verifyUserPin(user: User, pin: string): Promise<boolean> {
  if (!user.pinHash) {
    return false;
  }

  return bcrypt.compare(pin, user.pinHash);
}
