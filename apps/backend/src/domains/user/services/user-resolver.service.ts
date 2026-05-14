import { throwHttpProblem } from "../../../lib/problem-details";
import { randomUUID } from "crypto";
import { UserRepository } from "../../../repositories/UserRepository";
import type { UserId, User } from "../../../entities/user";

const userRepo = new UserRepository();

export async function resolveUserByOpenId(openId: string): Promise<User> {
  const trimmedOpenId = openId.trim();
  if (!trimmedOpenId) {
    return throwHttpProblem({ status: 401, detail: "Invalid WeChat session" });
  }

  const existingUser = await userRepo.findByOpenId(trimmedOpenId);
  if (existingUser) return existingUser;

  const createdUser = await userRepo.createIfNotExists({
    id: generateUserId(),
    openId: trimmedOpenId,
    role: ["authenticated"],
    status: "ACTIVE",
  });
  if (createdUser) return createdUser;

  const racedUser = await userRepo.findByOpenId(trimmedOpenId);
  if (!racedUser) {
    return throwHttpProblem({ status: 500, detail: "Failed to create user for WeChat session" });
  }
  return racedUser;
}

function generateUserId(): UserId {
  return randomUUID() as UserId;
}
