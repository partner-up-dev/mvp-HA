import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { jobRunner } from "../infra/jobs";
import { env } from "../lib/env";

const app = new Hono();

const tickHeaderSchema = z.object({
  "x-internal-token": z.string().min(1).optional(),
});

export const internalJobsRoute = app
  .post("/tick", zValidator("header", tickHeaderSchema), async (c) => {
    if (!env.JOB_RUNNER_INTERNAL_TOKEN) {
      throw new HTTPException(503, {
        message: "Internal job tick endpoint is not configured",
      });
    }

    const header = c.req.valid("header");
    if (header["x-internal-token"] !== env.JOB_RUNNER_INTERNAL_TOKEN) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const summary = await jobRunner.runDueJobs({
      source: "external-trigger",
      batchSize: env.JOB_RUNNER_CLAIM_BATCH_SIZE,
      maxBatches: env.JOB_RUNNER_MAX_BATCHES_PER_TICK,
      budgetMs: env.JOB_RUNNER_TICK_BUDGET_MS,
      leaseMs: env.JOB_RUNNER_LEASE_MS,
    });

    return c.json(summary);
  })
  .get("/status", async (c) => c.json(jobRunner.status()));
