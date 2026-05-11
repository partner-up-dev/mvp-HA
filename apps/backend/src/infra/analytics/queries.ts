import { sql } from "drizzle-orm";
import { db } from "../../lib/db";
import type { ColdStartAnalyticsEventType } from "./metrics";

type NumericLike = number | string | null | undefined;

interface ColdStartEventCountRow extends Record<string, unknown> {
  type: ColdStartAnalyticsEventType;
  total_count: NumericLike;
  success_count: NumericLike;
  failure_count: NumericLike;
  blocked_count: NumericLike;
}

export interface ColdStartAnalyticsEventCount {
  type: ColdStartAnalyticsEventType;
  totalCount: number;
  successCount: number;
  failureCount: number;
  blockedCount: number;
}

export interface ColdStartAnalyticsSummary {
  startAt: string;
  endAt: string;
  events: ColdStartAnalyticsEventCount[];
}

const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

const toNumber = (value: NumericLike): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const resolveWindow = (input: {
  startAt?: Date;
  endAt?: Date;
}): { startAt: Date; endAt: Date } => {
  const endAt = input.endAt ?? new Date();
  const startAt =
    input.startAt ?? new Date(endAt.getTime() - DEFAULT_WINDOW_MS);
  return { startAt, endAt };
};

export async function getColdStartAnalyticsSummary(input: {
  startAt?: Date;
  endAt?: Date;
} = {}): Promise<ColdStartAnalyticsSummary> {
  const { startAt, endAt } = resolveWindow(input);
  const startAtIso = startAt.toISOString();
  const endAtIso = endAt.toISOString();
  const rows = await db.execute<ColdStartEventCountRow>(sql`
    select
      type,
      count(*)::int as total_count,
      count(*) filter (where payload->>'actionResult' = 'success')::int as success_count,
      count(*) filter (where payload->>'actionResult' = 'failure')::int as failure_count,
      count(*) filter (where payload->>'actionResult' = 'blocked')::int as blocked_count
    from telemetry_events
    where occurred_at >= ${startAtIso}::timestamp
      and occurred_at < ${endAtIso}::timestamp
      and type in (
        'page_view',
        'anchor_event_form_impression',
        'anchor_event_form_started',
        'anchor_event_form_recommendation_impression',
        'anchor_event_recommendation_result',
        'event_assisted_create_result',
        'pr_join_result',
        'pr_waitlist_result'
      )
    group by type
    order by type
  `);

  return {
    startAt: startAtIso,
    endAt: endAtIso,
    events: rows.map((row) => ({
      type: row.type,
      totalCount: toNumber(row.total_count),
      successCount: toNumber(row.success_count),
      failureCount: toNumber(row.failure_count),
      blockedCount: toNumber(row.blocked_count),
    })),
  };
}
