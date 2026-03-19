import { eq, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { analyticsDailyAnchor } from "../../entities/analytics-daily-anchor";
import { analyticsDailyCommunity } from "../../entities/analytics-daily-community";
import { scenarioTypeMetrics } from "../../entities/scenario-type-metric";
import type { PRKind } from "../../entities/partner-request";
import { addDaysUtc8, getUtcRangeForDateKey } from "./time-window";

const PR_KINDS: readonly PRKind[] = ["ANCHOR", "COMMUNITY"];

type NumericLike = number | string | null | undefined;

interface LineMetrics {
  pageViews: number;
  joinSuccesses: number;
  joinConversion: number;
  minGroupSuccesses: number;
  eligiblePrCount: number;
  minGroupSuccessRate: number;
  confirmationSuccesses: number;
  confirmationRate: number;
  checkinSubmittedCount: number;
  checkinAttendedCount: number;
  actualCheckinRate: number;
  shareSuccesses: number;
  shareToJoinConversion: number;
  uniqueJoinUsers14d: number;
  repeatJoinUsers14d: number;
  repeatJoin14dRate: number;
}

interface ScenarioMetrics {
  prKind: PRKind;
  scenarioType: string;
  prCount: number;
  pageViews: number;
  joinSuccesses: number;
  shareSuccesses: number;
  fillRate: number;
  shareToJoinConversion: number;
}

interface DailyEventCountRow extends Record<string, unknown> {
  kind: PRKind;
  page_views: NumericLike;
  join_successes: NumericLike;
  confirmation_successes: NumericLike;
  checkin_submitted_count: NumericLike;
  checkin_attended_count: NumericLike;
  share_successes: NumericLike;
}

interface MinGroupRow extends Record<string, unknown> {
  kind: PRKind;
  min_group_successes: NumericLike;
}

interface EligiblePRRow extends Record<string, unknown> {
  kind: PRKind;
  eligible_pr_count: NumericLike;
}

interface RepeatJoinRow extends Record<string, unknown> {
  kind: PRKind;
  unique_join_users_14d: NumericLike;
  repeat_join_users_14d: NumericLike;
}

interface ScenarioEventRow extends Record<string, unknown> {
  kind: PRKind;
  scenario_type: string;
  page_views: NumericLike;
  join_successes: NumericLike;
  share_successes: NumericLike;
}

interface ScenarioFillRow extends Record<string, unknown> {
  kind: PRKind;
  scenario_type: string;
  pr_count: NumericLike;
  fill_rate: NumericLike;
}

const createEmptyLineMetrics = (): LineMetrics => ({
  pageViews: 0,
  joinSuccesses: 0,
  joinConversion: 0,
  minGroupSuccesses: 0,
  eligiblePrCount: 0,
  minGroupSuccessRate: 0,
  confirmationSuccesses: 0,
  confirmationRate: 0,
  checkinSubmittedCount: 0,
  checkinAttendedCount: 0,
  actualCheckinRate: 0,
  shareSuccesses: 0,
  shareToJoinConversion: 0,
  uniqueJoinUsers14d: 0,
  repeatJoinUsers14d: 0,
  repeatJoin14dRate: 0,
});

const toNumber = (value: NumericLike): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const safeRate = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0;
  return numerator / denominator;
};

const buildScenarioKey = (prKind: PRKind, scenarioType: string): string =>
  `${prKind}::${scenarioType}`;

const resolveLineKind = (kind: string): PRKind | null => {
  if (kind === "ANCHOR" || kind === "COMMUNITY") return kind;
  return null;
};

const upsertLineMetrics = async (
  dateKey: string,
  kind: PRKind,
  metrics: LineMetrics,
  computedAt: Date,
): Promise<void> => {
  if (kind === "ANCHOR") {
    await db
      .insert(analyticsDailyAnchor)
      .values({
        dateKey,
        ...metrics,
        computedAt,
      })
      .onConflictDoUpdate({
        target: analyticsDailyAnchor.dateKey,
        set: {
          ...metrics,
          computedAt,
        },
      });
    return;
  }

  await db
    .insert(analyticsDailyCommunity)
    .values({
      dateKey,
      ...metrics,
      computedAt,
    })
    .onConflictDoUpdate({
      target: analyticsDailyCommunity.dateKey,
      set: {
        ...metrics,
        computedAt,
      },
    });
};

const upsertScenarioMetrics = async (
  dateKey: string,
  rows: ScenarioMetrics[],
  computedAt: Date,
): Promise<void> => {
  await db
    .delete(scenarioTypeMetrics)
    .where(eq(scenarioTypeMetrics.dateKey, dateKey));

  if (rows.length === 0) return;

  await db.insert(scenarioTypeMetrics).values(
    rows.map((row) => ({
      dateKey,
      prKind: row.prKind,
      scenarioType: row.scenarioType,
      prCount: row.prCount,
      pageViews: row.pageViews,
      joinSuccesses: row.joinSuccesses,
      shareSuccesses: row.shareSuccesses,
      fillRate: row.fillRate,
      shareToJoinConversion: row.shareToJoinConversion,
      computedAt,
    })),
  );
};

const loadDailyEventCounts = async (
  startUtc: Date,
  endUtc: Date,
): Promise<DailyEventCountRow[]> => {
  return db.execute<DailyEventCountRow>(sql`
    select
      coalesce(nullif(de.payload->>'prKind', ''), pr.pr_kind) as kind,
      count(*) filter (where de.type = 'analytics.page_view')::int as page_views,
      count(*) filter (where de.type = 'analytics.pr_join_success')::int as join_successes,
      count(*) filter (where de.type = 'analytics.pr_confirm_success')::int as confirmation_successes,
      count(*) filter (where de.type = 'analytics.pr_checkin_submitted')::int as checkin_submitted_count,
      count(*) filter (
        where de.type = 'analytics.pr_checkin_submitted'
          and coalesce((de.payload->>'didAttend')::boolean, false)
      )::int as checkin_attended_count,
      count(*) filter (
        where de.type in ('analytics.share_link_native_success', 'analytics.share_link_copy_success')
      )::int as share_successes
    from domain_events de
    left join partner_requests pr
      on pr.id = case
        when (de.payload->>'prId') ~ '^[0-9]+$' then (de.payload->>'prId')::bigint
        else null
      end
    where de.type in (
      'analytics.page_view',
      'analytics.pr_join_success',
      'analytics.pr_confirm_success',
      'analytics.pr_checkin_submitted',
      'analytics.share_link_native_success',
      'analytics.share_link_copy_success'
    )
      and de.occurred_at >= ${startUtc}
      and de.occurred_at < ${endUtc}
      and coalesce(nullif(de.payload->>'prKind', ''), pr.pr_kind) in ('ANCHOR', 'COMMUNITY')
    group by kind
  `);
};

const loadMinGroupSuccesses = async (
  startUtc: Date,
  endUtc: Date,
): Promise<MinGroupRow[]> => {
  return db.execute<MinGroupRow>(sql`
    select
      pr.pr_kind as kind,
      count(distinct pr.id)::int as min_group_successes
    from domain_events de
    join partner_requests pr
      on pr.id = case
        when (de.payload->>'prId') ~ '^[0-9]+$' then (de.payload->>'prId')::bigint
        else null
      end
    where de.type = 'pr.status_changed'
      and de.occurred_at >= ${startUtc}
      and de.occurred_at < ${endUtc}
      and de.payload->>'toStatus' = 'READY'
      and coalesce(de.payload->>'trigger', '') = 'capacity'
    group by pr.pr_kind
  `);
};

const loadEligiblePRCounts = async (
  startUtc: Date,
  endUtc: Date,
): Promise<EligiblePRRow[]> => {
  return db.execute<EligiblePRRow>(sql`
    select
      pr_kind as kind,
      count(*)::int as eligible_pr_count
    from partner_requests
    where created_at >= ${startUtc}
      and created_at < ${endUtc}
    group by pr_kind
  `);
};

const loadRepeatJoinStats = async (
  windowStartUtc: Date,
  endUtc: Date,
): Promise<RepeatJoinRow[]> => {
  return db.execute<RepeatJoinRow>(sql`
    with joined as (
      select
        coalesce(nullif(de.payload->>'prKind', ''), pr.pr_kind) as kind,
        coalesce(nullif(de.payload->>'actorId', ''), nullif(de.aggregate_id, 'anonymous')) as actor_id,
        count(*)::int as join_count
      from domain_events de
      left join partner_requests pr
        on pr.id = case
          when (de.payload->>'prId') ~ '^[0-9]+$' then (de.payload->>'prId')::bigint
          else null
        end
      where de.type = 'analytics.pr_join_success'
        and de.occurred_at >= ${windowStartUtc}
        and de.occurred_at < ${endUtc}
        and coalesce(nullif(de.payload->>'prKind', ''), pr.pr_kind) in ('ANCHOR', 'COMMUNITY')
      group by kind, actor_id
    )
    select
      kind,
      count(*)::int as unique_join_users_14d,
      count(*) filter (where join_count >= 2)::int as repeat_join_users_14d
    from joined
    where actor_id is not null
    group by kind
  `);
};

const loadScenarioEventRows = async (
  startUtc: Date,
  endUtc: Date,
): Promise<ScenarioEventRow[]> => {
  return db.execute<ScenarioEventRow>(sql`
    select
      pr.pr_kind as kind,
      pr.type as scenario_type,
      count(*) filter (where de.type = 'analytics.page_view')::int as page_views,
      count(*) filter (where de.type = 'analytics.pr_join_success')::int as join_successes,
      count(*) filter (
        where de.type in ('analytics.share_link_native_success', 'analytics.share_link_copy_success')
      )::int as share_successes
    from domain_events de
    join partner_requests pr
      on pr.id = case
        when (de.payload->>'prId') ~ '^[0-9]+$' then (de.payload->>'prId')::bigint
        else null
      end
    where de.occurred_at >= ${startUtc}
      and de.occurred_at < ${endUtc}
      and de.type in (
        'analytics.page_view',
        'analytics.pr_join_success',
        'analytics.share_link_native_success',
        'analytics.share_link_copy_success'
      )
    group by pr.pr_kind, pr.type
  `);
};

const loadScenarioFillRows = async (
  startUtc: Date,
  endUtc: Date,
): Promise<ScenarioFillRow[]> => {
  return db.execute<ScenarioFillRow>(sql`
    select
      pr_kind as kind,
      type as scenario_type,
      count(*)::int as pr_count,
      coalesce(avg(
        case
          when max_partners is null or max_partners <= 0 then null
          else least(coalesce(array_length(partners, 1), 0)::double precision / max_partners::double precision, 1.0)
        end
      ), 0)::double precision as fill_rate
    from partner_requests
    where created_at >= ${startUtc}
      and created_at < ${endUtc}
    group by pr_kind, type
  `);
};

export async function aggregateDailyAnalyticsForDate(
  dateKey: string,
): Promise<void> {
  const { startUtc, endUtc } = getUtcRangeForDateKey(dateKey);
  const window14StartUtc = getUtcRangeForDateKey(addDaysUtc8(dateKey, -13)).startUtc;

  const lineMetricsByKind: Record<PRKind, LineMetrics> = {
    ANCHOR: createEmptyLineMetrics(),
    COMMUNITY: createEmptyLineMetrics(),
  };

  const dailyEventRows = await loadDailyEventCounts(startUtc, endUtc);
  for (const row of dailyEventRows) {
    const kind = resolveLineKind(row.kind);
    if (!kind) continue;
    const target = lineMetricsByKind[kind];
    target.pageViews = toNumber(row.page_views);
    target.joinSuccesses = toNumber(row.join_successes);
    target.confirmationSuccesses = toNumber(row.confirmation_successes);
    target.checkinSubmittedCount = toNumber(row.checkin_submitted_count);
    target.checkinAttendedCount = toNumber(row.checkin_attended_count);
    target.shareSuccesses = toNumber(row.share_successes);
  }

  const minGroupRows = await loadMinGroupSuccesses(startUtc, endUtc);
  for (const row of minGroupRows) {
    const kind = resolveLineKind(row.kind);
    if (!kind) continue;
    lineMetricsByKind[kind].minGroupSuccesses = toNumber(row.min_group_successes);
  }

  const eligiblePRRows = await loadEligiblePRCounts(startUtc, endUtc);
  for (const row of eligiblePRRows) {
    const kind = resolveLineKind(row.kind);
    if (!kind) continue;
    lineMetricsByKind[kind].eligiblePrCount = toNumber(row.eligible_pr_count);
  }

  const repeatRows = await loadRepeatJoinStats(window14StartUtc, endUtc);
  for (const row of repeatRows) {
    const kind = resolveLineKind(row.kind);
    if (!kind) continue;
    lineMetricsByKind[kind].uniqueJoinUsers14d = toNumber(row.unique_join_users_14d);
    lineMetricsByKind[kind].repeatJoinUsers14d = toNumber(row.repeat_join_users_14d);
  }

  for (const kind of PR_KINDS) {
    const metric = lineMetricsByKind[kind];
    metric.joinConversion = safeRate(metric.joinSuccesses, metric.pageViews);
    metric.minGroupSuccessRate = safeRate(
      metric.minGroupSuccesses,
      metric.eligiblePrCount,
    );
    metric.confirmationRate = safeRate(
      metric.confirmationSuccesses,
      metric.joinSuccesses,
    );
    metric.actualCheckinRate = safeRate(
      metric.checkinAttendedCount,
      metric.checkinSubmittedCount,
    );
    metric.shareToJoinConversion = safeRate(
      metric.joinSuccesses,
      metric.shareSuccesses,
    );
    metric.repeatJoin14dRate = safeRate(
      metric.repeatJoinUsers14d,
      metric.uniqueJoinUsers14d,
    );
  }

  const scenarioMetricMap = new Map<string, ScenarioMetrics>();
  const scenarioEventRows = await loadScenarioEventRows(startUtc, endUtc);
  for (const row of scenarioEventRows) {
    const kind = resolveLineKind(row.kind);
    const scenarioType = row.scenario_type?.trim();
    if (!kind || !scenarioType) continue;
    const key = buildScenarioKey(kind, scenarioType);
    const existing = scenarioMetricMap.get(key) ?? {
      prKind: kind,
      scenarioType,
      prCount: 0,
      pageViews: 0,
      joinSuccesses: 0,
      shareSuccesses: 0,
      fillRate: 0,
      shareToJoinConversion: 0,
    };
    existing.pageViews = toNumber(row.page_views);
    existing.joinSuccesses = toNumber(row.join_successes);
    existing.shareSuccesses = toNumber(row.share_successes);
    scenarioMetricMap.set(key, existing);
  }

  const scenarioFillRows = await loadScenarioFillRows(startUtc, endUtc);
  for (const row of scenarioFillRows) {
    const kind = resolveLineKind(row.kind);
    const scenarioType = row.scenario_type?.trim();
    if (!kind || !scenarioType) continue;
    const key = buildScenarioKey(kind, scenarioType);
    const existing = scenarioMetricMap.get(key) ?? {
      prKind: kind,
      scenarioType,
      prCount: 0,
      pageViews: 0,
      joinSuccesses: 0,
      shareSuccesses: 0,
      fillRate: 0,
      shareToJoinConversion: 0,
    };
    existing.prCount = toNumber(row.pr_count);
    existing.fillRate = toNumber(row.fill_rate);
    scenarioMetricMap.set(key, existing);
  }

  const scenarioRows = Array.from(scenarioMetricMap.values()).map((row) => ({
    ...row,
    shareToJoinConversion: safeRate(row.joinSuccesses, row.shareSuccesses),
  }));

  const computedAt = new Date();
  await upsertLineMetrics(dateKey, "ANCHOR", lineMetricsByKind.ANCHOR, computedAt);
  await upsertLineMetrics(
    dateKey,
    "COMMUNITY",
    lineMetricsByKind.COMMUNITY,
    computedAt,
  );
  await upsertScenarioMetrics(dateKey, scenarioRows, computedAt);
}
