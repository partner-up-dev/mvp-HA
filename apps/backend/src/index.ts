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
import { runTemporalMaintenanceTick } from "./domains/pr-core";
import { jobRunner } from "./infra/jobs";
import { processOutboxBatch } from "./infra/events";
import { env } from "./lib/env";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

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
  .route("/api/llm", llmRoute)
  .route("/api/share", shareRoute)
  .route("/api/upload", uploadRoute)
  .route("/api/wechat", wechatRoute)
  .route("/api/wecom", wecomRoute)
  .route("/api/config", configRoute)
  .route("/api/analytics", analyticsRoute);

// Health check
app.get("/health", (c) => c.json({ status: "ok", jobs: jobRunner.status() }));

// Export type for RPC client
export type AppType = typeof routes;

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
export type { PartnerId, PartnerStatus } from "./entities/partner";
export type { UserId, UserStatus, UserSex } from "./entities/user";
export {
  partnerRequestFieldsSchema,
  createStructuredPRSchema,
  createNaturalLanguagePRSchema,
  createPRStructuredStatusSchema,
} from "./entities/partner-request";
export { partnerIdSchema, partnerStatusSchema } from "./entities/partner";
export { userIdSchema, userStatusSchema, userSexSchema } from "./entities/user";

// ---------------------------------------------------------------------------
// Register background jobs via unified JobRunner (INFRA-03)
// ---------------------------------------------------------------------------

const registerBackgroundJobs = () => {
  // Temporal maintenance: expire / activate / release-unconfirmed
  jobRunner.register({
    name: "temporal-maintenance",
    intervalMs: env.PR_TEMPORAL_MAINTENANCE_INTERVAL_MS,
    enabled: env.PR_TEMPORAL_MAINTENANCE_INTERVAL_MS > 0,
    async handler() {
      const { processed, failed } = await runTemporalMaintenanceTick();
      if (failed > 0) {
        console.warn("Temporal maintenance tick completed with failures", {
          processed,
          failed,
        });
      }
    },
  });

  // Outbox event processor
  jobRunner.register({
    name: "outbox-processor",
    intervalMs: 5_000,
    async handler() {
      await processOutboxBatch();
    },
  });
};

// Start server
serve({
  fetch: app.fetch,
  port: env.PORT,
});

registerBackgroundJobs();

console.log(`Server running on http://localhost:${env.PORT}`);
