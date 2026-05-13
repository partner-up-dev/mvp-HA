import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  acceptedTelemetryEventTypes,
  ingestTelemetryEvents,
  ingestUserTelemetryEvents,
} from "../infra/telemetry";

const app = new Hono<AuthEnv>();

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

const optionalNullableString = (maxLength = 256) =>
  z.string().trim().max(maxLength).optional().nullable();

const userTelemetryEventNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(160)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/);

const userTelemetrySegmentSchema = z.object({
  id: z.string().uuid(),
  segmentKind: z.string().trim().min(1).max(80),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional().nullable(),
  eventId: z.number().int().positive().optional().nullable(),
  prId: z.number().int().positive().optional().nullable(),
  assignedMode: optionalNullableString(80),
  renderedMode: optionalNullableString(80),
  assignmentRevision: optionalNullableString(120),
  segmentStartRoute: optionalNullableString(512),
  segmentStartSpm: optionalNullableString(256),
  segmentStartSourceQr: optionalNullableString(256),
});

const userTelemetryEventSchema = z.object({
  id: z.string().uuid(),
  eventName: userTelemetryEventNameSchema,
  eventKind: z.enum(["page", "track", "identify", "group"]),
  occurredAt: z.string().datetime(),
  source: z.enum(["frontend", "backend"]).optional(),
  anonymousId: optionalNullableString(128),
  userIdHash: optionalNullableString(128),
  appJourneyId: z.string().uuid(),
  journeyStartedAt: z.string().datetime().optional().nullable(),
  journeyStartRoute: optionalNullableString(512),
  journeyStartRouteName: optionalNullableString(128),
  journeyStartReferrer: optionalNullableString(512),
  journeyStartSpm: optionalNullableString(256),
  journeyStartSourceQr: optionalNullableString(256),
  journeyStartEventId: z.number().int().positive().optional().nullable(),
  journeyStartPrId: z.number().int().positive().optional().nullable(),
  journeyEntryKind: optionalNullableString(80),
  segmentId: z.string().uuid().optional().nullable(),
  segment: userTelemetrySegmentSchema.optional().nullable(),
  routePath: optionalNullableString(512),
  routeName: optionalNullableString(128),
  referrer: optionalNullableString(512),
  startSpm: optionalNullableString(256),
  currentSpm: optionalNullableString(256),
  sourceQr: optionalNullableString(256),
  correlationId: optionalNullableString(128),
  requestId: optionalNullableString(128),
  traceId: optionalNullableString(128),
  eventIdRef: z.number().int().positive().optional().nullable(),
  prIdRef: z.number().int().positive().optional().nullable(),
  cardKey: optionalNullableString(160),
  segmentKey: optionalNullableString(160),
  properties: z.record(z.unknown()).default({}),
});

const userTelemetryBatchSchema = z.object({
  events: z.array(userTelemetryEventSchema).min(1).max(100),
});

export const telemetryRoute = app
  .post("/events", zValidator("json", batchSchema), async (c) => {
    const { events } = c.req.valid("json");
    const result = await ingestTelemetryEvents(
      events.map((event) => ({
        ...event,
        payload: event.payload as Record<string, unknown>,
      })),
    );
    return c.json(result);
  })
  .post(
    "/user/events",
    authMiddleware,
    zValidator("json", userTelemetryBatchSchema),
    async (c) => {
      const { events } = c.req.valid("json");
      const auth = c.get("auth");
      const result = await ingestUserTelemetryEvents(
        events.map((event) => ({
          ...event,
          properties: event.properties as Record<string, unknown>,
        })),
        { authenticatedUserId: auth.userId },
      );
      return c.json(result);
    },
  );
