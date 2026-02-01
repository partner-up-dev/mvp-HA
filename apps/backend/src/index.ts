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
import { posterRoute } from "./controllers/poster.controller";
import { env } from "./lib/env";
import {
  posterRenderService,
  posterStorageService,
} from "./services/posterServices";

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
  .route("/api/poster", posterRoute)
  .route("/api/wechat", wechatRoute);

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
export type { PosterRatio } from "./services/HtmlPosterService";

// Start server
serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`Server running on http://localhost:${env.PORT}`);

setInterval(() => {
  posterStorageService.cleanupOldPosters().catch((error) => {
    console.error("Poster cleanup failed:", error);
  });
}, 24 * 60 * 60 * 1000);

const handleShutdown = async () => {
  await posterRenderService.cleanup();
  process.exit(0);
};

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);
