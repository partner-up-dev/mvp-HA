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
import {
  posterRenderService,
  posterRoute,
  posterStorageService,
} from "./controllers/poster.controller";
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
  .route("/api/upload", uploadRoute)
  .route("/api/wechat", wechatRoute)
  .route("/api/poster", posterRoute);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Export type for RPC client
export type AppType = typeof routes;

// Export types for frontend use
export type {
  ParsedPartnerRequest,
  PRStatus,
  PRId,
  PartnerRequestSummary,
} from "./entities/partner-request";
export type { PosterRatio, PosterStyle } from "./lib/poster";

const cleanupIntervalMs = env.POSTER_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
const cleanupMaxAgeMs = env.POSTER_CLEANUP_MAX_AGE_HOURS * 60 * 60 * 1000;

setInterval(() => {
  posterStorageService.cleanupOldPosters(cleanupMaxAgeMs).catch((error) => {
    console.error("Failed to cleanup posters:", error);
  });
}, cleanupIntervalMs);

const shutdown = async () => {
  await posterRenderService.cleanup();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start server
serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Server running on http://localhost:${env.PORT}`);
