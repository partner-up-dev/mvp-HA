import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  listAnchorEvents,
  getAnchorEventDetail,
  getAnchorEventDemandCards,
  assignAnchorEventLandingMode,
  getAnchorEventFormModeData,
  submitAnchorEventFormModePreferenceTags,
  recommendAnchorEventFormModePRs,
} from "../domains/anchor-event";
import { authMiddleware, type AuthEnv } from "../auth/middleware";

const app = new Hono<AuthEnv>();

const eventIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

const formModePreferenceSubmissionSchema = z.object({
  labels: z.array(z.string().trim().min(1).max(80)).max(16),
});

const formModeRecommendationSchema = z.object({
  locationId: z.string().trim().min(1),
  startAt: z.string().datetime(),
  preferences: z.array(z.string().trim().min(1).max(80)).max(16),
});

export const anchorEventRoute = app
  .use("*", authMiddleware)
  // GET /api/events - List all active anchor events (Event Plaza)
  .get("/", async (c) => {
    const events = await listAnchorEvents();
    return c.json(events);
  })
  // GET /api/events/:eventId - Get anchor event detail with time-window discovery
  .get("/:eventId", zValidator("param", eventIdParamSchema), async (c) => {
    const { eventId } = c.req.valid("param");
    const detail = await getAnchorEventDetail(eventId);
    return c.json(detail);
  })
  .get("/:eventId/form-mode", zValidator("param", eventIdParamSchema), async (c) => {
    const { eventId } = c.req.valid("param");
    const detail = await getAnchorEventFormModeData(eventId);
    return c.json(detail);
  })
  .get(
    "/:eventId/landing-assignment",
    zValidator("param", eventIdParamSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const assignment = await assignAnchorEventLandingMode(eventId);
      return c.json(assignment);
    },
  )
  .get(
    "/:eventId/demand-cards",
    zValidator("param", eventIdParamSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const cards = await getAnchorEventDemandCards(eventId);
      return c.json(cards);
    },
  )
  .post(
    "/:eventId/preference-tags/submissions",
    zValidator("param", eventIdParamSchema),
    zValidator("json", formModePreferenceSubmissionSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const { labels } = c.req.valid("json");
      const result = await submitAnchorEventFormModePreferenceTags(eventId, labels);
      return c.json(result);
    },
  )
  .post(
    "/:eventId/form-mode/recommendation",
    zValidator("param", eventIdParamSchema),
    zValidator("json", formModeRecommendationSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await recommendAnchorEventFormModePRs({
        eventId,
        ...payload,
      });
      return c.json(result);
    },
  );
