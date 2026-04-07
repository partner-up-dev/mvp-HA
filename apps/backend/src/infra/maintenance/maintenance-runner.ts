import { processOutboxBatch } from "../events";
import { jobRunner, type RunDueJobsSummary } from "../jobs";
import { env } from "../../lib/env";
import { toErrorMessage } from "../../lib/error-message";
import { TimeoutError, withTimeout } from "../../lib/with-timeout";
import { isStatementTimeoutError } from "../../lib/pg-timeouts";

export interface OutboxDrainSummary {
  attemptedBatches: number;
  processedBatches: number;
  processedEvents: number;
  stoppedReason: "EMPTY" | "MAX_BATCHES" | "BUDGET_EXHAUSTED" | "ERROR";
  timedOut: boolean;
  error: string | null;
  durationMs: number;
}

export interface MaintenanceTickSummary {
  source: "request-tail" | "external-trigger" | "manual";
  outbox: OutboxDrainSummary;
  jobs: RunDueJobsSummary | null;
  jobsError: string | null;
  durationMs: number;
}

export interface SkippedMaintenanceTickSummary {
  source: "external-trigger";
  skipped: true;
  skipReason: "IN_FLIGHT";
  durationMs: number;
}

export type ExternalMaintenanceTickResult =
  | MaintenanceTickSummary
  | SkippedMaintenanceTickSummary;

let externalMaintenanceTickInFlight: Promise<MaintenanceTickSummary> | null = null;

export async function drainOutboxBatches({
  maxBatches,
  batchTimeoutMs,
  timeoutMessage,
  overallBudgetMs,
  useJsTimeout = true,
}: {
  maxBatches: number;
  batchTimeoutMs: number;
  timeoutMessage: string;
  overallBudgetMs?: number;
  useJsTimeout?: boolean;
}): Promise<OutboxDrainSummary> {
  const startedAt = Date.now();
  const deadlineAtMs =
    overallBudgetMs === undefined ? null : startedAt + overallBudgetMs;
  let attemptedBatches = 0;
  let processedBatches = 0;
  let processedEvents = 0;

  for (let i = 0; i < maxBatches; i += 1) {
    if (deadlineAtMs !== null && Date.now() >= deadlineAtMs) {
      return {
        attemptedBatches,
        processedBatches,
        processedEvents,
        stoppedReason: "BUDGET_EXHAUSTED",
        timedOut: false,
        error: null,
        durationMs: Date.now() - startedAt,
      };
    }

    attemptedBatches += 1;
    const effectiveBatchTimeoutMs =
      deadlineAtMs === null
        ? batchTimeoutMs
        : Math.max(1, Math.min(batchTimeoutMs, deadlineAtMs - Date.now()));

    try {
      const task = processOutboxBatch({
        statementTimeoutMs: effectiveBatchTimeoutMs,
      });
      const processed = useJsTimeout
        ? await withTimeout(task, effectiveBatchTimeoutMs, timeoutMessage)
        : await task;

      if (processed === 0) {
        return {
          attemptedBatches,
          processedBatches,
          processedEvents,
          stoppedReason: "EMPTY",
          timedOut: false,
          error: null,
          durationMs: Date.now() - startedAt,
        };
      }

      processedBatches += 1;
      processedEvents += processed;
    } catch (error) {
      return {
        attemptedBatches,
        processedBatches,
        processedEvents,
        stoppedReason: "ERROR",
        timedOut:
          error instanceof TimeoutError || isStatementTimeoutError(error),
        error: toErrorMessage(error),
        durationMs: Date.now() - startedAt,
      };
    }
  }

  return {
    attemptedBatches,
    processedBatches,
    processedEvents,
    stoppedReason: "MAX_BATCHES",
    timedOut: false,
    error: null,
    durationMs: Date.now() - startedAt,
  };
}

export async function runExternalMaintenanceTick(): Promise<MaintenanceTickSummary> {
  const startedAt = Date.now();
  const maintenanceBudgetMs = env.MAINTENANCE_TICK_BUDGET_MS;
  let jobs: RunDueJobsSummary | null = null;
  let jobsError: string | null = null;
  const remainingJobBudgetMs = Math.max(
    0,
    startedAt + maintenanceBudgetMs - Date.now(),
  );

  if (remainingJobBudgetMs > 0) {
    try {
      jobs = await jobRunner.runDueJobs({
        source: "external-trigger",
        batchSize: env.JOB_RUNNER_CLAIM_BATCH_SIZE,
        maxBatches: env.JOB_RUNNER_MAX_BATCHES_PER_TICK,
        budgetMs: remainingJobBudgetMs,
        leaseMs: env.JOB_RUNNER_LEASE_MS,
        claimStatementTimeoutMs: remainingJobBudgetMs,
      });
    } catch (error) {
      jobsError = toErrorMessage(error);
    }
  }

  const remainingOutboxBudgetMs = Math.max(
    0,
    startedAt + maintenanceBudgetMs - Date.now(),
  );
  const outbox = await drainOutboxBatches({
    maxBatches: env.OUTBOX_TICK_MAX_BATCHES,
    batchTimeoutMs: env.OUTBOX_TICK_BATCH_TIMEOUT_MS,
    timeoutMessage: "External maintenance outbox tick timed out",
    overallBudgetMs: remainingOutboxBudgetMs,
    useJsTimeout: false,
  });

  return {
    source: "external-trigger",
    outbox,
    jobs,
    jobsError,
    durationMs: Date.now() - startedAt,
  };
}

export async function runExternalMaintenanceTickOrSkip(): Promise<ExternalMaintenanceTickResult> {
  if (externalMaintenanceTickInFlight) {
    return {
      source: "external-trigger",
      skipped: true,
      skipReason: "IN_FLIGHT",
      durationMs: 0,
    };
  }

  externalMaintenanceTickInFlight = runExternalMaintenanceTick().finally(() => {
    externalMaintenanceTickInFlight = null;
  });

  return externalMaintenanceTickInFlight;
}
