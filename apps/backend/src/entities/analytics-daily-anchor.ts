import {
  date,
  doublePrecision,
  integer,
  pgTable,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const analyticsDailyAnchor = pgTable("analytics_daily_anchor", {
  dateKey: date("date_key", { mode: "string" }).primaryKey(),
  pageViews: integer("page_views").notNull().default(0),
  joinSuccesses: integer("join_successes").notNull().default(0),
  joinConversion: doublePrecision("join_conversion").notNull().default(0),
  minGroupSuccesses: integer("min_group_successes").notNull().default(0),
  eligiblePrCount: integer("eligible_pr_count").notNull().default(0),
  minGroupSuccessRate: doublePrecision("min_group_success_rate")
    .notNull()
    .default(0),
  confirmationSuccesses: integer("confirmation_successes").notNull().default(0),
  confirmationRate: doublePrecision("confirmation_rate").notNull().default(0),
  checkinSubmittedCount: integer("checkin_submitted_count").notNull().default(0),
  checkinAttendedCount: integer("checkin_attended_count").notNull().default(0),
  actualCheckinRate: doublePrecision("actual_checkin_rate").notNull().default(0),
  shareSuccesses: integer("share_successes").notNull().default(0),
  shareToJoinConversion: doublePrecision("share_to_join_conversion")
    .notNull()
    .default(0),
  uniqueJoinUsers14d: integer("unique_join_users_14d").notNull().default(0),
  repeatJoinUsers14d: integer("repeat_join_users_14d").notNull().default(0),
  repeatJoin14dRate: doublePrecision("repeat_join_14d_rate").notNull().default(0),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const insertAnalyticsDailyAnchorSchema =
  createInsertSchema(analyticsDailyAnchor);
export const selectAnalyticsDailyAnchorSchema =
  createSelectSchema(analyticsDailyAnchor);

export type AnalyticsDailyAnchorRow = typeof analyticsDailyAnchor.$inferSelect;
export type NewAnalyticsDailyAnchorRow = typeof analyticsDailyAnchor.$inferInsert;
