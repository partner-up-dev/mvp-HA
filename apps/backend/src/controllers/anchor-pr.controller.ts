import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { searchAnchorPRs } from "../domains/pr";
import { authMiddleware, type AuthEnv } from "../auth/middleware";

const app = new Hono<AuthEnv>();
const isoDateSearchParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const anchorPRSearchQuerySchema = z.object({
  eventId: z.coerce.number().int().positive(),
  date: z.preprocess(
    (value) => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === "string") {
        return [value];
      }
      return [];
    },
    z.array(isoDateSearchParamSchema).min(1).max(28),
  ),
});

export const anchorPRRoute = app
  .use("*", authMiddleware)
  .get("/search", zValidator("query", anchorPRSearchQuerySchema), async (c) => {
    const { eventId, date } = c.req.valid("query");
    const result = await searchAnchorPRs({
      eventId,
      dates: date,
    });
    return c.json(result);
  });
