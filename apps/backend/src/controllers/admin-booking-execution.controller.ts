import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  adminAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";
import {
  getAdminBookingExecutionWorkspace,
  submitAdminPRBookingExecution,
} from "../domains/admin-booking-execution";

const app = new Hono<AdminAuthEnv>();

const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const submitBookingExecutionSchema = z.object({
  targetResourceId: z.number().int().positive(),
  result: z.enum(["SUCCESS", "FAILED"]),
  reason: z.string().trim().nullable().optional(),
});

export const adminBookingExecutionRoute = app
  .use("*", adminAuthMiddleware)
  .get("/booking-execution/workspace", async (c) => {
    const result = await getAdminBookingExecutionWorkspace();
    return c.json(result);
  })
  .post(
    "/prs/:id/booking-execution",
    zValidator("param", prIdParamSchema),
    zValidator("json", submitBookingExecutionSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");
      const auth = c.get("auth");
      if (!auth.userId) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }
      const result = await submitAdminPRBookingExecution({
        prId: id,
        targetResourceId: payload.targetResourceId,
        result: payload.result,
        reason: payload.reason ?? null,
        actorUserId: auth.userId,
      });
      return c.json(result);
    },
  );
