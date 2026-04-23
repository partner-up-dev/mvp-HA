/**
 * 职责：聚合所有 Controller，导出 AppType。
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { partnerRequestRoute } from "./controllers/partner-request.controller";
import { authRoute } from "./controllers/auth.controller";
import { userRoute } from "./controllers/user.controller";
import { llmRoute } from "./controllers/llm.controller";
import { uploadRoute } from "./controllers/upload.controller";
import { wechatRoute } from "./controllers/wechat.controller";
import { shareRoute } from "./controllers/share.controller";
import { wecomRoute } from "./controllers/wecom.controller";
import { configRoute } from "./controllers/config.controller";
import { analyticsRoute } from "./controllers/analytics.controller";
import { anchorEventRoute } from "./controllers/anchor-event.controller";
import { internalMaintenanceRoute } from "./controllers/internal-maintenance.controller";
import { poiRoute } from "./controllers/poi.controller";
import { metaRoute } from "./controllers/meta.controller";
import { adminAnchorManagementRoute } from "./controllers/admin-anchor-management.controller";
import { adminBookingExecutionRoute } from "./controllers/admin-booking-execution.controller";
import { adminBookingSupportRoute } from "./controllers/admin-booking-support.controller";
import { adminPoiRoute } from "./controllers/admin-poi.controller";
import { jobRunner } from "./infra/jobs";
import {
  bootstrapAnalyticsAggregationJobs,
  registerAnalyticsAggregationJobs,
} from "./infra/analytics";
import {
  isWeChatPRMessageNotificationConfigured,
  registerWeChatActivityStartReminderJobs,
  registerWeChatBookingResultJobs,
  registerWeChatNewPartnerJobs,
  registerWeChatPRMessageJobs,
  registerWeChatReminderJobs,
  scheduleWeChatPRMessageNotification,
} from "./infra/notifications";
import { registerNotificationOutboxHandlers } from "./domains/notification";
import { drainOutboxBatches } from "./infra/maintenance";
import { env } from "./lib/env";
import { withTimeout } from "./lib/with-timeout";
import {
  getWechatDomainVerificationContent,
  MPWX_DOMAIN_VERIFICATION_FILENAME,
  WXOA_DOMAIN_VERIFICATION_FILENAME,
} from "./lib/wechat-domain-verification";

const app = new Hono();
registerWeChatReminderJobs();
registerWeChatActivityStartReminderJobs();
registerWeChatNewPartnerJobs();
registerWeChatBookingResultJobs();
registerWeChatPRMessageJobs();
registerNotificationOutboxHandlers({
  isPRMessageChannelConfigured: isWeChatPRMessageNotificationConfigured,
  schedulePRMessageNotification: scheduleWeChatPRMessageNotification,
});
registerAnalyticsAggregationJobs();
void bootstrapAnalyticsAggregationJobs().catch((error) => {
  console.error(
    "[Analytics] failed to bootstrap daily aggregation jobs",
    error,
  );
});

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-User-Id", "X-User-Pin"],
    exposeHeaders: ["x-access-token"],
  }),
);
app.use("*", async (c, next) => {
  try {
    await next();
  } finally {
    if (
      c.req.method === "OPTIONS" ||
      c.req.path === "/health" ||
      c.req.path === `/${MPWX_DOMAIN_VERIFICATION_FILENAME}` ||
      c.req.path.startsWith("/internal/")
    ) {
      return;
    }

    kickRequestTailMaintenance();
  }
});

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const codedError = err as HTTPException & { code?: string };
    const payload: { error: string; code?: string } = {
      error: err.message,
    };
    if (typeof codedError.code === "string" && codedError.code.length > 0) {
      payload.code = codedError.code;
    }

    return c.json(payload, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// Mount routes
const routes = app
  .route("/api/auth", authRoute)
  .route("/api/users", userRoute)
  .route("/api/pr", partnerRequestRoute)
  .route("/api/events", anchorEventRoute)
  .route("/api/llm", llmRoute)
  .route("/api/share", shareRoute)
  .route("/api/upload", uploadRoute)
  .route("/api/wechat", wechatRoute)
  .route("/api/wecom", wecomRoute)
  .route("/api/config", configRoute)
  .route("/api/meta", metaRoute)
  .route("/api/analytics", analyticsRoute)
  .route("/api/telemetry", analyticsRoute)
  .route("/api/pois", poiRoute)
  .route("/api/admin", adminAnchorManagementRoute)
  .route("/api/admin", adminBookingExecutionRoute)
  .route("/api/admin", adminBookingSupportRoute)
  .route("/api/admin", adminPoiRoute)
  .route("/internal/maintenance", internalMaintenanceRoute);

// Health check
app.get(`/${MPWX_DOMAIN_VERIFICATION_FILENAME}`, (c) => {
  return c.body(
    getWechatDomainVerificationContent(MPWX_DOMAIN_VERIFICATION_FILENAME),
    200,
    {
      "Content-Type": "text/plain; charset=utf-8",
    },
  );
});

app.get(`/${WXOA_DOMAIN_VERIFICATION_FILENAME}`, (c) => {
  return c.body(
    getWechatDomainVerificationContent(WXOA_DOMAIN_VERIFICATION_FILENAME),
    200,
    {
      "Content-Type": "text/plain; charset=utf-8",
    },
  );
});

app.get("/health", (c) => c.json({ status: "ok", jobs: jobRunner.status() }));

// Export type for RPC client
export type AppType = typeof routes;

let nextRequestTailJobTickAtMs = 0;
let requestTailMaintenanceInFlight: Promise<void> | null = null;

const kickRequestTailMaintenance = (): void => {
  if (requestTailMaintenanceInFlight) {
    return;
  }

  requestTailMaintenanceInFlight = runRequestTailMaintenance()
    .catch((error) => {
      console.error("[RequestTail] maintenance failed", error);
    })
    .finally(() => {
      requestTailMaintenanceInFlight = null;
    });
};

const runRequestTailMaintenance = async (): Promise<void> => {
  const outboxSummary = await drainOutboxBatches({
    maxBatches: env.OUTBOX_REQUEST_DRAIN_MAX_BATCHES,
    batchTimeoutMs: env.OUTBOX_REQUEST_DRAIN_TIMEOUT_MS,
    timeoutMessage: "Request-tail outbox drain timed out",
  });
  if (outboxSummary.error) {
    console.error("[RequestTail] outbox drain failed", outboxSummary.error);
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
        claimStatementTimeoutMs: env.REQUEST_TAIL_JOB_TICK_BUDGET_MS,
      }),
      env.REQUEST_TAIL_JOB_TICK_BUDGET_MS,
      "Request-tail job tick timed out",
    );
  } catch (error) {
    console.error("[RequestTail] job tick failed", error);
  }
};

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
export type { UserId, UserRole, UserStatus, UserSex } from "./entities/user";
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
export type { VisibilityStatus } from "./entities/partner-request";
export type {
  AnchorEventSummary,
  AnchorEventDetail,
  AnchorEventDemandCard,
  TimeWindowDetail,
  AnchorPRSummary,
} from "./domains/anchor-event";
export {
  partnerRequestFieldsSchema,
  createStructuredPRSchema,
  createNaturalLanguagePRSchema,
  createPRStructuredStatusSchema,
} from "./entities/partner-request";
export { PR_MESSAGE_BODY_MAX_LENGTH } from "./entities/pr-message";
export { partnerIdSchema, partnerStatusSchema } from "./entities/partner";
export {
  userIdSchema,
  userRoleSchema,
  userStatusSchema,
  userSexSchema,
} from "./entities/user";

// Start server
serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Server running on http://localhost:${env.PORT}`);
