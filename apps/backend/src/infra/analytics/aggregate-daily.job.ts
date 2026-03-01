import { z } from "zod";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { aggregateDailyAnalyticsForDate } from "./aggregate-daily.service";
import {
  addDaysUtc8,
  formatDateKeyUtc8,
  getRunAtForDateKey,
  getYesterdayDateKeyUtc8,
} from "./time-window";

const ANALYTICS_DAILY_AGGREGATE_JOB_TYPE = "analytics.aggregate.daily";
const ANALYTICS_DEDUPE_PREFIX = "analytics-daily";
const BOOTSTRAP_DELAY_MS = 15_000;

const payloadSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type DailyAggregatePayload = z.infer<typeof payloadSchema>;

let handlerRegistered = false;

const buildDedupeKey = (dateKey: string): string =>
  `${ANALYTICS_DEDUPE_PREFIX}:${dateKey}`;

const scheduleDailyAggregationForDate = async (
  payload: DailyAggregatePayload,
  runAt?: Date,
): Promise<void> => {
  await jobRunner.scheduleOnce({
    jobType: ANALYTICS_DAILY_AGGREGATE_JOB_TYPE,
    runAt: runAt ?? getRunAtForDateKey(payload.dateKey),
    dedupeKey: buildDedupeKey(payload.dateKey),
    payload,
  });
};

async function handleDailyAggregateJob(
  payloadRaw: Record<string, unknown>,
  _context: JobHandlerContext,
): Promise<void> {
  const parseResult = payloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid analytics daily aggregate job payload");
  }

  const payload = parseResult.data;
  await aggregateDailyAnalyticsForDate(payload.dateKey);

  const nextDateKey = addDaysUtc8(payload.dateKey, 1);
  await scheduleDailyAggregationForDate({ dateKey: nextDateKey });
}

export function registerAnalyticsAggregationJobs(): void {
  if (handlerRegistered) return;
  jobRunner.registerHandler(
    ANALYTICS_DAILY_AGGREGATE_JOB_TYPE,
    handleDailyAggregateJob,
  );
  handlerRegistered = true;
}

export async function bootstrapAnalyticsAggregationJobs(): Promise<void> {
  const now = new Date();
  const todayDateKey = formatDateKeyUtc8(now);
  const yesterdayDateKey = getYesterdayDateKeyUtc8(now);

  await scheduleDailyAggregationForDate(
    { dateKey: yesterdayDateKey },
    new Date(Date.now() + BOOTSTRAP_DELAY_MS),
  );

  await scheduleDailyAggregationForDate({ dateKey: todayDateKey });
}
