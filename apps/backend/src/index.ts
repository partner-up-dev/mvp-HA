/**
 * 职责：聚合所有 Controller，导出 AppType。
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { partnerRequestRoute } from "./controllers/partner-request.controller";
import { llmRoute } from "./controllers/llm.controller";
import { uploadRoute } from "./controllers/upload.controller";
import { wechatRoute } from "./controllers/wechat.controller";
import { shareRoute } from "./controllers/share.controller";
import { wecomRoute } from "./controllers/wecom.controller";
import { configRoute } from "./controllers/config.controller";
import { analyticsRoute } from "./controllers/analytics.controller";
import { anchorEventRoute } from "./controllers/anchor-event.controller";
import { internalJobsRoute } from "./controllers/internal-jobs.controller";
import { jobRunner } from "./infra/jobs";
import {
  bootstrapAnalyticsAggregationJobs,
  registerAnalyticsAggregationJobs,
} from "./infra/analytics";
import { processOutboxBatch } from "./infra/events";
import { registerWeChatReminderJobs } from "./infra/notifications";
import { env } from "./lib/env";
import { withTimeout } from "./lib/with-timeout";

const app = new Hono();
registerWeChatReminderJobs();
registerAnalyticsAggregationJobs();
void bootstrapAnalyticsAggregationJobs().catch((error) => {
  console.error("[Analytics] failed to bootstrap daily aggregation jobs", error);
});

// Middleware
app.use("*", logger());
app.use("*", cors());
app.use("*", async (c, next) => {
  try {
    await next();
  } finally {
    if (
      c.req.method === "OPTIONS" ||
      c.req.path === "/health" ||
      c.req.path.startsWith("/internal/")
    ) {
      return;
    }

    try {
      for (let i = 0; i < env.OUTBOX_REQUEST_DRAIN_MAX_BATCHES; i += 1) {
        const processed = await withTimeout(
          processOutboxBatch(),
          env.OUTBOX_REQUEST_DRAIN_TIMEOUT_MS,
          "Request-tail outbox drain timed out",
        );
        if (processed === 0) break;
      }
    } catch (error) {
      console.error("[RequestTail] outbox drain failed", error);
    }

    if (Date.now() < nextRequestTailJobTickAtMs) {
      return;
    }
    nextRequestTailJobTickAtMs =
      Date.now() + env.REQUEST_TAIL_JOB_TICK_MIN_INTERVAL_MS;

    try {
      await withTimeout(
        jobRunner.runDueJobs({
          source: "request-tail",
          batchSize: env.JOB_RUNNER_CLAIM_BATCH_SIZE,
          maxBatches: env.REQUEST_TAIL_JOB_TICK_MAX_BATCHES,
          budgetMs: env.REQUEST_TAIL_JOB_TICK_BUDGET_MS,
          leaseMs: env.JOB_RUNNER_LEASE_MS,
        }),
        env.REQUEST_TAIL_JOB_TICK_BUDGET_MS,
        "Request-tail job tick timed out",
      );
    } catch (error) {
      console.error("[RequestTail] job tick failed", error);
    }
  }
});

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Mount routes
const routes = app
  .route("/api/pr", partnerRequestRoute)
  .route("/api/events", anchorEventRoute)
  .route("/api/llm", llmRoute)
  .route("/api/share", shareRoute)
  .route("/api/upload", uploadRoute)
  .route("/api/wechat", wechatRoute)
  .route("/api/wecom", wecomRoute)
  .route("/api/config", configRoute)
  .route("/api/analytics", analyticsRoute)
  .route("/internal/jobs", internalJobsRoute);

// Health check
app.get("/health", (c) => c.json({ status: "ok", jobs: jobRunner.status() }));

// Export type for RPC client
export type AppType = typeof routes;

let nextRequestTailJobTickAtMs = 0;

// Export types for frontend use
export type {
  PartnerRequestFields,
  CreatePRStructuredStatus,
  PRStatus,
  PRStatusManual,
  PRId,
  PartnerRequestSummary,
  WeekdayLabel,
} from "./entities/partner-request";
export type {
  PartnerId,
  PartnerStatus,
  PartnerPaymentStatus,
  ReimbursementStatus,
} from "./entities/partner";
export type { UserId, UserStatus, UserSex } from "./entities/user";
export type {
  AnchorEventId,
  AnchorEventStatus,
  LocationEntry,
  TimeWindowEntry,
} from "./entities/anchor-event";
export type {
  AnchorEventBatchId,
  AnchorEventBatchStatus,
} from "./entities/anchor-event-batch";
export type { PRKind, VisibilityStatus } from "./entities/partner-request";
export type {
  AnchorEventSummary,
  AnchorEventDetail,
  BatchDetail,
  AnchorPRSummary,
} from "./domains/anchor-event";
export {
  partnerRequestFieldsSchema,
  createStructuredPRSchema,
  createNaturalLanguagePRSchema,
  createPRStructuredStatusSchema,
} from "./entities/partner-request";
export { partnerIdSchema, partnerStatusSchema } from "./entities/partner";
export { userIdSchema, userStatusSchema, userSexSchema } from "./entities/user";

// Start server
serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Server running on http://localhost:${env.PORT}`);
