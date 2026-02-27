import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  listAnchorEvents,
  getAnchorEventDetail,
} from "../domains/anchor-event";

const app = new Hono();

const eventIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

export const anchorEventRoute = app
  // GET /api/events - List all active anchor events (Event Plaza)
  .get("/", async (c) => {
    const events = await listAnchorEvents();
    return c.json(events);
  })
  // GET /api/events/:eventId - Get anchor event detail with batches & PRs
  .get("/:eventId", zValidator("param", eventIdParamSchema), async (c) => {
    const { eventId } = c.req.valid("param");
    const detail = await getAnchorEventDetail(eventId);
    return c.json(detail);
  });
