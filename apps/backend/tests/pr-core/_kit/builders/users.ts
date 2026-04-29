import { randomUUID } from "node:crypto";
import { issueUserAuth } from "../../../../src/auth/middleware";
import type { User } from "../../../../src/entities/user";
import { UserRepository } from "../../../../src/repositories/UserRepository";

const userRepo = new UserRepository();

export type ScenarioUser = {
  token: string;
  user: User;
};

export async function givenUser(label: string): Promise<ScenarioUser> {
  const user = await userRepo.create({
    id: randomUUID(),
    role: "authenticated",
    nickname: `scenario-${label}`,
    status: "ACTIVE",
  });

  if (!user) {
    throw new Error(`Failed to create scenario user: ${label}`);
  }

  return {
    user,
    token: issueUserAuth(user.id).token,
  };
}
