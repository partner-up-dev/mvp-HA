import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  userNotificationOpts,
  type WeChatNotificationKind,
  type UserNotificationOpt,
} from "../entities/user-notification-opt";
import type { UserId } from "../entities/user";

export type NotificationSubscriptionSnapshot = {
  enabled: boolean;
  optInAt: Date | null;
};

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
    return this.upsertWechatNotificationSubscription(
      userId,
      "REMINDER_CONFIRMATION",
      enabled,
    );
  }

  getSubscriptionSnapshot(
    opt: UserNotificationOpt | null,
    kind: WeChatNotificationKind,
  ): NotificationSubscriptionSnapshot {
    if (!opt) {
      return {
        enabled: false,
        optInAt: null,
      };
    }

    if (kind === "REMINDER_CONFIRMATION") {
      return {
        enabled: opt.wechatReminderOptIn,
        optInAt: opt.wechatReminderOptInAt,
      };
    }
    if (kind === "BOOKING_RESULT") {
      return {
        enabled: opt.wechatBookingResultOptIn,
        optInAt: opt.wechatBookingResultOptInAt,
      };
    }
    return {
      enabled: opt.wechatNewPartnerOptIn,
      optInAt: opt.wechatNewPartnerOptInAt,
    };
  }

  async upsertWechatNotificationSubscription(
    userId: UserId,
    kind: WeChatNotificationKind,
    enabled: boolean,
  ): Promise<UserNotificationOpt | null> {
    const now = new Date();
    const optInAt = enabled ? now : null;

    if (kind === "REMINDER_CONFIRMATION") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatReminderOptIn: enabled,
          wechatReminderOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatReminderOptIn: enabled,
            wechatReminderOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    if (kind === "BOOKING_RESULT") {
      const result = await db
        .insert(userNotificationOpts)
        .values({
          userId,
          wechatBookingResultOptIn: enabled,
          wechatBookingResultOptInAt: optInAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userNotificationOpts.userId,
          set: {
            wechatBookingResultOptIn: enabled,
            wechatBookingResultOptInAt: optInAt,
            updatedAt: now,
          },
        })
        .returning();
      return result[0] ?? null;
    }

    const result = await db
      .insert(userNotificationOpts)
      .values({
        userId,
        wechatNewPartnerOptIn: enabled,
        wechatNewPartnerOptInAt: optInAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userNotificationOpts.userId,
        set: {
          wechatNewPartnerOptIn: enabled,
          wechatNewPartnerOptInAt: optInAt,
          updatedAt: now,
        },
      })
      .returning();
    return result[0] ?? null;
  }
}
