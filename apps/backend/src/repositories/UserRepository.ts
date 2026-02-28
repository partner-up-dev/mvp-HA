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

  async applyReliabilityDelta(
    userId: UserId,
    delta: {
      joined?: number;
      confirmed?: number;
      attended?: number;
      released?: number;
    },
  ): Promise<void> {
    const current = await this.findById(userId);
    if (!current) return;

    const nextJoinCount = Math.max(
      0,
      current.reliabilityJoinCount + (delta.joined ?? 0),
    );
    const nextConfirmCount = Math.max(
      0,
      current.reliabilityConfirmCount + (delta.confirmed ?? 0),
    );
    const nextAttendCount = Math.max(
      0,
      current.reliabilityAttendCount + (delta.attended ?? 0),
    );
    const nextReleaseCount = Math.max(
      0,
      current.reliabilityReleaseCount + (delta.released ?? 0),
    );

    const nextJoinToConfirmRatio =
      nextJoinCount > 0 ? nextConfirmCount / nextJoinCount : 0;
    const nextConfirmToAttendRatio =
      nextConfirmCount > 0 ? nextAttendCount / nextConfirmCount : 0;
    const nextReleaseFrequency =
      nextJoinCount > 0 ? nextReleaseCount / nextJoinCount : 0;

    await db
      .update(users)
      .set({
        reliabilityJoinCount: nextJoinCount,
        reliabilityConfirmCount: nextConfirmCount,
        reliabilityAttendCount: nextAttendCount,
        reliabilityReleaseCount: nextReleaseCount,
        joinToConfirmRatio: nextJoinToConfirmRatio,
        confirmToAttendRatio: nextConfirmToAttendRatio,
        releaseFrequency: nextReleaseFrequency,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateWechatReminderSubscription(
    userId: UserId,
    enabled: boolean,
  ) {
    const now = new Date();
    const result = await db
      .update(users)
      .set({
        wechatReminderOptIn: enabled,
        wechatReminderOptInAt: enabled ? now : null,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] ?? null;
  }
}
