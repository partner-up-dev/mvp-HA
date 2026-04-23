import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  anchorEventStatusSchema,
  anchorEventTimePoolConfigSchema,
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
  userLocationEntrySchema,
  prStatusManualSchema,
  visibilityStatusSchema,
} from "../entities";
import {
  adminAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";
import {
  createAdminAnchorEvent,
  createAdminAnchorPR,
  createAdminAnchorPRMessage,
  getAdminAnchorWorkspace,
  releaseAdminAnchorPRPartner,
  updateAdminAnchorEvent,
  updateAdminAnchorPRContent,
  updateAdminAnchorPRStatus,
  updateAdminAnchorPRVisibility,
} from "../domains/admin-anchor-management";
import { prMessageCreateSchema } from "./pr-controller.shared";

const app = new Hono<AdminAuthEnv>();

const eventIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
const partnerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  partnerId: z.coerce.number().int().positive(),
});

const timeWindowSchema = z.tuple([
  z.string().nullable(),
  z.string().nullable(),
]);

const adminAnchorEventInputSchema = z.object({
  title: z.string().trim().min(1),
  type: z.string().trim().min(1),
  description: z.string().trim().nullable(),
  systemLocationPool: z.array(z.string().trim().min(1)),
  userLocationPool: z.array(userLocationEntrySchema),
  timePoolConfig: anchorEventTimePoolConfigSchema,
  defaultMinPartners: z.number().int().nonnegative().nullable(),
  defaultMaxPartners: z.number().int().nonnegative().nullable(),
  coverImage: z.string().trim().nullable(),
  betaGroupQrCode: z.string().trim().nullable(),
  status: anchorEventStatusSchema,
});

const adminCreateAnchorPRInputSchema = z.object({
  timeWindow: timeWindowSchema,
  title: z.string().trim().nullable(),
  type: z.string().trim().nullable(),
  location: z.string().trim().min(1),
  minPartners: z.number().int().nonnegative().nullable(),
  maxPartners: z.number().int().nonnegative().nullable(),
  preferences: z.array(z.string().trim()),
  notes: z.string().trim().nullable(),
  confirmationStartOffsetMinutes: z.number().int().nonnegative(),
  confirmationEndOffsetMinutes: z.number().int().nonnegative(),
  joinLockOffsetMinutes: z.number().int().nonnegative(),
});

const adminUpdateAnchorPRContentSchema = z.object({
  title: z.string().trim().nullable(),
  type: z.string().trim().min(1),
  location: z.string().trim().nullable(),
  minPartners: z.number().int().nonnegative().nullable(),
  maxPartners: z.number().int().nonnegative().nullable(),
  preferences: z.array(z.string().trim()),
  notes: z.string().trim().nullable(),
  confirmationStartOffsetMinutes: z.number().int().nonnegative(),
  confirmationEndOffsetMinutes: z.number().int().nonnegative(),
  joinLockOffsetMinutes: z.number().int().nonnegative(),
});

const adminUpdateAnchorPRStatusSchema = z.object({
  status: prStatusManualSchema,
});

const adminUpdateAnchorPRVisibilitySchema = z.object({
  visibilityStatus: visibilityStatusSchema,
});
const adminManualReleaseSchema = z.object({
  reason: z.string().trim().min(1),
});

export const adminAnchorManagementRoute = app
  .use("*", adminAuthMiddleware)
  .get("/anchor-pr/workspace", async (c) => {
    const result = await getAdminAnchorWorkspace();
    return c.json(result);
  })
  .post(
    "/anchor-events",
    zValidator("json", adminAnchorEventInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createAdminAnchorEvent({
        ...payload,
        description: payload.description || null,
        systemLocationPool: normalizeSystemLocationPool(
          payload.systemLocationPool,
        ),
        userLocationPool: normalizeUserLocationPool(payload.userLocationPool),
        coverImage: payload.coverImage || null,
        betaGroupQrCode: payload.betaGroupQrCode || null,
      });
      return c.json(result);
    },
  )
  .patch(
    "/anchor-events/:eventId",
    zValidator("param", eventIdParamSchema),
    zValidator("json", adminAnchorEventInputSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminAnchorEvent(eventId, {
        ...payload,
        description: payload.description || null,
        systemLocationPool: normalizeSystemLocationPool(
          payload.systemLocationPool,
        ),
        userLocationPool: normalizeUserLocationPool(payload.userLocationPool),
        coverImage: payload.coverImage || null,
        betaGroupQrCode: payload.betaGroupQrCode || null,
      });
      return c.json(result);
    },
  )
  .post(
    "/anchor-events/:eventId/anchor-prs",
    zValidator("param", eventIdParamSchema),
    zValidator("json", adminCreateAnchorPRInputSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await createAdminAnchorPR(eventId, payload.timeWindow, {
        ...payload,
        title: payload.title || null,
        type: payload.type || null,
        notes: payload.notes || null,
      });
      return c.json(result);
    },
  )
  .post(
    "/anchor-prs/:id/messages",
    zValidator("param", prIdParamSchema),
    zValidator("json", prMessageCreateSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { body } = c.req.valid("json");
      const auth = c.get("auth");
      if (!auth.userId) {
        throw new Error("Admin user id missing after admin auth");
      }
      const result = await createAdminAnchorPRMessage({
        prId: id,
        body,
        actorUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .patch(
    "/anchor-prs/:id/content",
    zValidator("param", prIdParamSchema),
    zValidator("json", adminUpdateAnchorPRContentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminAnchorPRContent(id, {
        ...payload,
        title: payload.title || null,
        location: payload.location || null,
        notes: payload.notes || null,
      });
      return c.json(result);
    },
  )
  .patch(
    "/anchor-prs/:id/status",
    zValidator("param", prIdParamSchema),
    zValidator("json", adminUpdateAnchorPRStatusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { status } = c.req.valid("json");
      const result = await updateAdminAnchorPRStatus(id, status);
      return c.json(result);
    },
  )
  .patch(
    "/anchor-prs/:id/visibility",
    zValidator("param", prIdParamSchema),
    zValidator("json", adminUpdateAnchorPRVisibilitySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { visibilityStatus } = c.req.valid("json");
      await updateAdminAnchorPRVisibility(id, visibilityStatus);
      return c.json({ ok: true });
    },
  )
  .post(
    "/anchor-prs/:id/partners/:partnerId/release",
    zValidator("param", partnerIdParamSchema),
    zValidator("json", adminManualReleaseSchema),
    async (c) => {
      const { id, partnerId } = c.req.valid("param");
      const { reason } = c.req.valid("json");
      const auth = c.get("auth");
      const result = await releaseAdminAnchorPRPartner({
        prId: id,
        partnerId,
        reason,
        actorUserId: auth.userId ?? null,
      });
      return c.json(result);
    },
  );
