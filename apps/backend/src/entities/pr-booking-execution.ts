import {
  bigserial,
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { partnerRequests, type PRId } from "./partner-request";
import {
  prSupportResources,
  type PRSupportResource,
} from "./pr-support-resource";
import { users, type UserId } from "./user";

export const prBookingExecutionResultSchema = z.enum([
  "SUCCESS",
  "FAILED",
]);

export type PRBookingExecutionResult = z.infer<
  typeof prBookingExecutionResultSchema
>;

export const prBookingExecutions = pgTable(
  "pr_booking_executions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    targetResourceId: bigint("target_resource_id", { mode: "number" })
      .$type<PRSupportResource["id"] | null>()
      .references(() => prSupportResources.id, { onDelete: "set null" }),
    targetResourceTitle: text("target_resource_title").notNull(),
    bookingContactPhone: text("booking_contact_phone"),
    actorUserId: uuid("actor_user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id),
    result: text("result")
      .$type<PRBookingExecutionResult>()
      .notNull(),
    reason: text("reason"),
    notificationTargetCount: integer("notification_target_count")
      .notNull()
      .default(0),
    notificationSuccessCount: integer("notification_success_count")
      .notNull()
      .default(0),
    notificationFailureCount: integer("notification_failure_count")
      .notNull()
      .default(0),
    notificationSkippedCount: integer("notification_skipped_count")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const insertPRBookingExecutionSchema = createInsertSchema(
  prBookingExecutions,
  {
    result: prBookingExecutionResultSchema,
  },
);

export const selectPRBookingExecutionSchema = createSelectSchema(
  prBookingExecutions,
  {
    result: prBookingExecutionResultSchema,
  },
);

export type PRBookingExecution =
  typeof prBookingExecutions.$inferSelect;
export type NewPRBookingExecution =
  typeof prBookingExecutions.$inferInsert;
