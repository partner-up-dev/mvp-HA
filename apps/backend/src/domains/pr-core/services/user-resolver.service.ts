/**
 * User resolver service — looks up or auto-creates a user by WeChat openId.
 */

import { randomUUID } from "crypto";
import { HTTPException } from "hono/http-exception";
import { UserRepository } from "../../../repositories/UserRepository";
import type { UserId, User } from "../../../entities/user";

const userRepo = new UserRepository();

export async function resolveUserByOpenId(openId: string): Promise<User> {
  const trimmedOpenId = openId.trim();
  if (!trimmedOpenId) {
    throw new HTTPException(401, { message: "Invalid WeChat session" });
  }

  const existingUser = await userRepo.findByOpenId(trimmedOpenId);
  if (existingUser) return existingUser;

  const createdUser = await userRepo.createIfNotExists({
    id: generateUserId(),
    openId: trimmedOpenId,
    status: "ACTIVE",
  });
  if (createdUser) return createdUser;

  // Race-condition fallback
  const racedUser = await userRepo.findByOpenId(trimmedOpenId);
  if (!racedUser) {
    throw new HTTPException(500, {
      message: "Failed to create user for WeChat session",
    });
  }
  return racedUser;
}

function generateUserId(): UserId {
  return `u_${randomUUID().replace(/-/g, "")}` as UserId;
}
