/**
 * Analytics ingestion controller (INFRA-04).
 *
 * POST /api/analytics/events — accepts a batch of typed analytics events
 * from the frontend tracking SDK.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { ingestAnalyticsEvents } from "../infra/analytics";

const app = new Hono();

const analyticsEventSchema = z.object({
  type: z.string().min(1).max(128),
  payload: z.record(z.unknown()),
  occurredAt: z.string().datetime(),
  sessionId: z.string().max(128).optional(),
});

const batchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(100),
});

export const analyticsRoute = app.post(
  "/events",
  zValidator("json", batchSchema),
  async (c) => {
    const { events } = c.req.valid("json");
    const count = await ingestAnalyticsEvents(
      events.map((e) => ({
        ...e,
        payload: e.payload as Record<string, unknown>,
      })),
    );
    return c.json({ ingested: count });
  },
);
