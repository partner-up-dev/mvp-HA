import {
  bigserial,
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { jobs } from "./job";
import { partnerRequests, type PRId } from "./partner-request";
import { users, type UserId } from "./user";

export const confirmationReminderTypes = [
  "CONFIRMATION_WINDOW_OPEN",
  "CONFIRMATION_WINDOW_LAST_CALL",
] as const;
export const legacyReminderTypes = ["T_MINUS_24H", "T_MINUS_2H"] as const;
const reminderTypeValues = [
  ...confirmationReminderTypes,
  ...legacyReminderTypes,
] as const;

export const reminderTypeSchema = z.enum(reminderTypeValues);
export type ReminderType = z.infer<typeof reminderTypeSchema>;
export type ConfirmationReminderType =
  (typeof confirmationReminderTypes)[number];
export type LegacyReminderType = (typeof legacyReminderTypes)[number];

export const notificationDeliveryResultSchema = z.enum([
  "SUCCESS",
  "FAILED",
  "SKIPPED",
]);
export type NotificationDeliveryResult = z.infer<
  typeof notificationDeliveryResultSchema
>;

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobId: bigint("job_id", { mode: "number" }).references(() => jobs.id, {
      onDelete: "set null",
    }),
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reminderType: text("reminder_type").$type<ReminderType>().notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    sentAt: timestamp("sent_at"),
    result: text("result")
      .$type<NotificationDeliveryResult>()
      .notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    jobIdIdx: index("notification_deliveries_job_id_idx").on(table.jobId),
    prIdIdx: index("notification_deliveries_pr_id_idx").on(table.prId),
    userIdIdx: index("notification_deliveries_user_id_idx").on(table.userId),
  }),
);

export const insertNotificationDeliverySchema =
  createInsertSchema(notificationDeliveries);
export const selectNotificationDeliverySchema =
  createSelectSchema(notificationDeliveries);

export type NotificationDeliveryRow = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDeliveryRow =
  typeof notificationDeliveries.$inferInsert;
