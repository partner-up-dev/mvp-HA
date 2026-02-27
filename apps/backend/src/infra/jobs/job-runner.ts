/**
 * Unified Job Runner (INFRA-03).
 *
 * Replaces scattered `setInterval` logic with a centralized, observable
 * job execution framework.
 *
 * Supports:
 * - Periodic (cron-like) jobs with configurable intervals
 * - Delayed (one-shot) jobs
 * - Non-overlapping execution (guards against re-entrant ticks)
 * - Graceful shutdown
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobConfig {
  /** Unique job name for logging / observability. */
  name: string;
  /** Interval in milliseconds. Set to 0 to disable. */
  intervalMs: number;
  /** The async function to execute on each tick. */
  handler: () => Promise<void>;
  /** Whether this job is enabled. Default true. */
  enabled?: boolean;
  /** Run immediately on registration (before first interval). Default true. */
  runImmediately?: boolean;
}

interface RunningJob {
  config: JobConfig;
  timer: ReturnType<typeof setInterval> | null;
  running: boolean;
  lastRunAt: Date | null;
  lastError: Error | null;
}

// ---------------------------------------------------------------------------
// JobRunner implementation
// ---------------------------------------------------------------------------

class JobRunnerImpl {
  private jobs = new Map<string, RunningJob>();
  private stopped = false;

  /**
   * Register and start a periodic job.
   * If a job with the same name already exists, it is replaced.
   */
  register(config: JobConfig): void {
    if (this.stopped) {
      console.warn(
        `[JobRunner] Cannot register job "${config.name}" — runner is stopped`,
      );
      return;
    }

    // Stop previous instance if replacing
    this.unregister(config.name);

    const enabled = config.enabled ?? true;
    if (!enabled || config.intervalMs <= 0) {
      console.info(`[JobRunner] Job "${config.name}" is disabled`);
      return;
    }

    const job: RunningJob = {
      config,
      timer: null,
      running: false,
      lastRunAt: null,
      lastError: null,
    };

    const tick = async () => {
      if (job.running) return;
      job.running = true;
      try {
        await config.handler();
        job.lastRunAt = new Date();
        job.lastError = null;
      } catch (err) {
        job.lastError = err instanceof Error ? err : new Error(String(err));
        console.error(
          `[JobRunner] Job "${config.name}" failed:`,
          job.lastError.message,
        );
      } finally {
        job.running = false;
      }
    };

    // Run immediately if requested (default)
    if (config.runImmediately !== false) {
      void tick();
    }

    job.timer = setInterval(() => void tick(), config.intervalMs);
    job.timer.unref?.();

    this.jobs.set(config.name, job);
    console.info(
      `[JobRunner] Registered job "${config.name}" (interval: ${config.intervalMs}ms)`,
    );
  }

  /**
   * Schedule a one-shot delayed job.
   * The job fires once after `delayMs` and is then removed.
   */
  scheduleOnce(
    name: string,
    delayMs: number,
    handler: () => Promise<void>,
  ): void {
    if (this.stopped) return;

    const timeout = setTimeout(async () => {
      try {
        await handler();
      } catch (err) {
        console.error(`[JobRunner] One-shot job "${name}" failed:`, err);
      } finally {
        this.jobs.delete(name);
      }
    }, delayMs);

    (timeout as NodeJS.Timeout).unref?.();

    this.jobs.set(name, {
      config: { name, intervalMs: 0, handler },
      timer: timeout as unknown as ReturnType<typeof setInterval>,
      running: false,
      lastRunAt: null,
      lastError: null,
    });
  }

  /** Remove and stop a specific job. */
  unregister(name: string): void {
    const existing = this.jobs.get(name);
    if (existing?.timer) {
      clearInterval(existing.timer);
    }
    this.jobs.delete(name);
  }

  /** Stop all jobs and prevent new registrations. */
  shutdown(): void {
    this.stopped = true;
    for (const [name, job] of this.jobs) {
      if (job.timer) clearInterval(job.timer);
      console.info(`[JobRunner] Stopped job "${name}"`);
    }
    this.jobs.clear();
  }

  /** Get status of all registered jobs (for health / observability). */
  status(): Array<{
    name: string;
    running: boolean;
    lastRunAt: Date | null;
    lastError: string | null;
  }> {
    return Array.from(this.jobs.values()).map((j) => ({
      name: j.config.name,
      running: j.running,
      lastRunAt: j.lastRunAt,
      lastError: j.lastError?.message ?? null,
    }));
  }
}

/** Singleton job runner instance. */
export const jobRunner = new JobRunnerImpl();
