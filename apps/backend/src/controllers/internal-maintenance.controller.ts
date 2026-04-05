import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { env } from "../lib/env";
import { runExternalMaintenanceTick } from "../infra/maintenance";

const app = new Hono();

const tickHeaderSchema = z.object({
  "x-internal-token": z.string().min(1).optional(),
});

export const internalMaintenanceRoute = app.post(
  "/tick",
  zValidator("header", tickHeaderSchema),
  async (c) => {
    if (!env.JOB_RUNNER_INTERNAL_TOKEN) {
      throw new HTTPException(503, {
        message: "Internal maintenance tick endpoint is not configured",
      });
    }

    const header = c.req.valid("header");
    if (header["x-internal-token"] !== env.JOB_RUNNER_INTERNAL_TOKEN) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }

    const summary = await runExternalMaintenanceTick();
    if (summary.outbox.error || summary.jobsError) {
      return c.json(summary, 500);
    }

    return c.json(summary);
  },
);
