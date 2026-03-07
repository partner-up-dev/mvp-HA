import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  userNotificationOpts,
  type UserNotificationOpt,
} from "../entities/user-notification-opt";
import type { UserId } from "../entities/user";

export class UserNotificationOptRepository {
  async findByUserId(userId: UserId): Promise<UserNotificationOpt | null> {
    const result = await db
      .select()
      .from(userNotificationOpts)
      .where(eq(userNotificationOpts.userId, userId));
    return result[0] ?? null;
  }

  async upsertWechatReminderSubscription(
    userId: UserId,
    enabled: boolean,
  ): Promise<UserNotificationOpt | null> {
    const now = new Date();
    const result = await db
      .insert(userNotificationOpts)
      .values({
        userId,
        wechatReminderOptIn: enabled,
        wechatReminderOptInAt: enabled ? now : null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userNotificationOpts.userId,
        set: {
          wechatReminderOptIn: enabled,
          wechatReminderOptInAt: enabled ? now : null,
          updatedAt: now,
        },
      })
      .returning();
    return result[0] ?? null;
  }
}
