import {
  date,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const scenarioLineKindValues = ["ANCHOR", "COMMUNITY"] as const;
export type ScenarioLineKind = (typeof scenarioLineKindValues)[number];

export const scenarioTypeMetrics = pgTable(
  "scenario_type_metrics",
  {
    dateKey: date("date_key", { mode: "string" }).notNull(),
    lineKind: text("line_kind").$type<ScenarioLineKind>().notNull(),
    scenarioType: text("scenario_type").notNull(),
    prCount: integer("pr_count").notNull().default(0),
    pageViews: integer("page_views").notNull().default(0),
    joinSuccesses: integer("join_successes").notNull().default(0),
    shareSuccesses: integer("share_successes").notNull().default(0),
    fillRate: doublePrecision("fill_rate").notNull().default(0),
    shareToJoinConversion: doublePrecision("share_to_join_conversion")
      .notNull()
      .default(0),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.dateKey, table.lineKind, table.scenarioType],
    }),
  }),
);

export const insertScenarioTypeMetricSchema =
  createInsertSchema(scenarioTypeMetrics);
export const selectScenarioTypeMetricSchema =
  createSelectSchema(scenarioTypeMetrics);

export type ScenarioTypeMetricRow = typeof scenarioTypeMetrics.$inferSelect;
export type NewScenarioTypeMetricRow = typeof scenarioTypeMetrics.$inferInsert;
