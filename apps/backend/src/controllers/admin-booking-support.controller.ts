import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  adminAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";
import {
  bookingHandledBySchema,
  supportResourceKindSchema,
  supportSettlementModeSchema,
} from "../entities/anchor-event-support-resource";
import {
  getAdminBookingSupportConfig,
  replaceEventBookingSupportResources,
} from "../domains/pr-booking-support";

const app = new Hono<AdminAuthEnv>();

const eventIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

const eventSupportResourceInputSchema = z.object({
  code: z.string().trim().min(1),
  title: z.string().trim().min(1),
  resourceKind: supportResourceKindSchema,
  appliesToAllLocations: z.boolean(),
  locationIds: z.array(z.string().trim().min(1)),
  bookingRequired: z.boolean(),
  bookingHandledBy: bookingHandledBySchema.nullable(),
  bookingDeadlineRule: z.string().trim().nullable(),
  bookingLocksParticipant: z.boolean(),
  cancellationPolicy: z.string().trim().nullable(),
  settlementMode: supportSettlementModeSchema,
  subsidyRate: z.number().finite().nullable(),
  subsidyCap: z.number().int().nullable(),
  requiresUserTransferToPlatform: z.boolean(),
  summaryText: z.string().trim().min(1),
  detailRules: z.array(z.string().trim().min(1)),
  displayOrder: z.number().int(),
});

const eventSupportResourceListSchema = z.object({
  resources: z.array(eventSupportResourceInputSchema),
});

export const adminBookingSupportRoute = app
  .use("*", adminAuthMiddleware)
  .get(
    "/events/:eventId/booking-support-resources",
    zValidator("param", eventIdParamSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const result = await getAdminBookingSupportConfig(eventId);
      return c.json(result);
    },
  )
  .put(
    "/events/:eventId/booking-support-resources",
    zValidator("param", eventIdParamSchema),
    zValidator("json", eventSupportResourceListSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const { resources } = c.req.valid("json");
      const result = await replaceEventBookingSupportResources(eventId, resources);
      return c.json({ resources: result });
    },
  );
