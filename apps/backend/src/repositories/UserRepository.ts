import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users, type NewUser, type UserId } from "../entities/user";

export class UserRepository {
  async findById(id: UserId) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ?? null;
  }

  async findByOpenId(openId: string) {
    const result = await db.select().from(users).where(eq(users.openId, openId));
    return result[0] ?? null;
  }

  async createIfNotExists(data: NewUser) {
    const result = await db
      .insert(users)
      .values(data)
      .onConflictDoNothing({ target: users.openId })
      .returning();
    return result[0] ?? null;
  }
}
