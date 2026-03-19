import { boolean, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users, type UserId } from "./user";

export const wechatNotificationKindSchema = z.enum([
  "REMINDER_CONFIRMATION",
  "BOOKING_RESULT",
  "NEW_PARTNER",
]);
export type WeChatNotificationKind = z.infer<
  typeof wechatNotificationKindSchema
>;

export const userNotificationOpts = pgTable("user_notification_opts", {
  userId: uuid("user_id")
    .$type<UserId>()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  wechatReminderOptIn: boolean("wechat_reminder_opt_in")
    .notNull()
    .default(false),
  wechatReminderOptInAt: timestamp("wechat_reminder_opt_in_at"),
  wechatBookingResultOptIn: boolean("wechat_booking_result_opt_in")
    .notNull()
    .default(false),
  wechatBookingResultOptInAt: timestamp("wechat_booking_result_opt_in_at"),
  wechatNewPartnerOptIn: boolean("wechat_new_partner_opt_in")
    .notNull()
    .default(false),
  wechatNewPartnerOptInAt: timestamp("wechat_new_partner_opt_in_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserNotificationOptSchema =
  createInsertSchema(userNotificationOpts);
export const selectUserNotificationOptSchema =
  createSelectSchema(userNotificationOpts);

export type UserNotificationOpt = typeof userNotificationOpts.$inferSelect;
export type NewUserNotificationOpt = typeof userNotificationOpts.$inferInsert;
