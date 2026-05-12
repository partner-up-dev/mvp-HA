import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  analyticsAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";
import { getColdStartAnalyticsSummary } from "../infra/analytics";

const app = new Hono<AdminAuthEnv>();

const coldStartSummaryQuerySchema = z.object({
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

const parseOptionalDate = (value: string | undefined): Date | undefined =>
  value ? new Date(value) : undefined;

export const analyticsRoute = app
  .use("*", analyticsAuthMiddleware)
  .get(
    "/cold-start/summary",
    zValidator("query", coldStartSummaryQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const result = await getColdStartAnalyticsSummary({
        startAt: parseOptionalDate(query.startAt),
        endAt: parseOptionalDate(query.endAt),
      });
      return c.json(result);
    },
  );
