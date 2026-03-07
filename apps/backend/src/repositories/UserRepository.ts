import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users, type NewUser, type UserId } from "../entities/user";
import { userReliability } from "../entities/user-reliability";
import { userNotificationOpts } from "../entities/user-notification-opt";

export class UserRepository {
  async create(data: NewUser) {
    return db.transaction(async (tx) => {
      const result = await tx.insert(users).values(data).returning();
      const created = result[0] ?? null;
      if (!created) return null;

      await tx
        .insert(userReliability)
        .values({ userId: created.id })
        .onConflictDoNothing({ target: userReliability.userId });
      await tx
        .insert(userNotificationOpts)
        .values({ userId: created.id })
        .onConflictDoNothing({ target: userNotificationOpts.userId });

      return created;
    });
  }

  async findById(id: UserId) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] ?? null;
  }

  async findByOpenId(openId: string) {
    const result = await db.select().from(users).where(eq(users.openId, openId));
    return result[0] ?? null;
  }

  async createIfNotExists(data: NewUser) {
    return db.transaction(async (tx) => {
      const result = await tx
        .insert(users)
        .values(data)
        .onConflictDoNothing({ target: users.openId })
        .returning();
      const created = result[0] ?? null;
      if (!created) return null;

      await tx
        .insert(userReliability)
        .values({ userId: created.id })
        .onConflictDoNothing({ target: userReliability.userId });
      await tx
        .insert(userNotificationOpts)
        .values({ userId: created.id })
        .onConflictDoNothing({ target: userNotificationOpts.userId });

      return created;
    });
  }

  async updatePinHash(userId: UserId, pinHash: string) {
    const result = await db
      .update(users)
      .set({
        pinHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] ?? null;
  }
}
