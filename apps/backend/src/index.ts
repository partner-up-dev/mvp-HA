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
  .route("/api/wechat", wechatRoute);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Export type for RPC client
export type AppType = typeof routes;

// Export types for frontend use
export type {
  PartnerRequestFields,
  PRStatus,
  PRStatusManual,
  PRId,
  PartnerRequestSummary,
} from "./entities/partner-request";

// Start server
serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Server running on http://localhost:${env.PORT}`);
