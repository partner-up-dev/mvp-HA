import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  acceptedTelemetryEventTypes,
  ingestTelemetryEvents,
} from "../infra/telemetry";

const app = new Hono();

const telemetryEventTypeSchema = z.enum(acceptedTelemetryEventTypes);

const telemetryEventSchema = z.object({
  type: telemetryEventTypeSchema,
  source: z.string().max(64).optional(),
  payload: z.record(z.unknown()),
  occurredAt: z.string().datetime(),
  sessionId: z.string().max(128).optional(),
  userIdHash: z.string().max(128).optional(),
  requestId: z.string().max(128).optional(),
});

const batchSchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(100),
});

export const telemetryRoute = app.post(
  "/events",
  zValidator("json", batchSchema),
  async (c) => {
    const { events } = c.req.valid("json");
    const result = await ingestTelemetryEvents(
      events.map((event) => ({
        ...event,
        payload: event.payload as Record<string, unknown>,
      })),
    );
    return c.json(result);
  },
);
