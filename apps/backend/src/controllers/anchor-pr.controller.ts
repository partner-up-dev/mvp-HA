import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  acceptAlternativeBatch,
  checkIn,
  confirmSlot,
  getReimbursementStatus,
  getAnchorPRBookingSupport,
  getAnchorPRDetail,
  recommendAlternativeBatches,
} from "../domains/pr-anchor";
import { updateAnchorPRBookingContactPhone } from "../domains/pr-booking-support";
import {
  exitPR,
  getPRPartnerProfile,
  joinPR,
  updatePRContent,
  updatePRStatus,
} from "../domains/pr-core";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import { authorizeCreatorMutation } from "../domains/pr-core/services/creator-mutation-auth.service";
import { HTTPException } from "hono/http-exception";
import {
  prIdParamSchema,
  prPartnerProfileParamSchema,
  requireAnchorAuthenticatedIdentity,
  requireAuthenticatedOpenId,
  requireSessionUserId,
  resolveAvatarUrl,
  tryReadAnchorAuthenticatedIdentity,
  getAuthenticatedUserId,
  updateContentSchema,
  updateStatusSchema,
} from "./pr-controller.shared";

const app = new Hono<AuthEnv>();
const prRepo = new PartnerRequestRepository();
const slotCheckInSchema = z.object({
  didAttend: z.boolean().optional(),
  wouldJoinAgain: z.boolean().nullable().optional(),
});
const acceptAlternativeBatchSchema = z.object({
  targetTimeWindow: z.tuple([z.string().nullable(), z.string().nullable()]),
});
const anchorJoinSchema = z
  .object({
    bookingContactPhone: z.string().trim().min(1).optional(),
  })
  .default({});
const updateBookingContactPhoneSchema = z.object({
  phone: z.string().trim().min(1),
});

const ensureAnchorPR = async (id: number) => {
  const request = await prRepo.findById(id);
  if (!request || request.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }
  return request;
};

export const anchorPRRoute = app
  .use("*", authMiddleware)
  .get("/:id", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const identity = await tryReadAnchorAuthenticatedIdentity(c);
    const result = await getAnchorPRDetail(id, identity ?? undefined);
    return c.json(result);
  })
  .get(
    "/:id/partners/:partnerId/profile",
    zValidator("param", prPartnerProfileParamSchema),
    async (c) => {
      const { id, partnerId } = c.req.valid("param");
      const viewerUserId = getAuthenticatedUserId(c);
      const profile = await getPRPartnerProfile({
        prId: id,
        partnerId,
        prKind: "ANCHOR",
        viewerUserId,
      });

      return c.json({
        ...profile,
        avatarUrl: resolveAvatarUrl(c.req.url, profile.avatarUrl),
      });
    },
  )
  .get(
    "/:id/booking-support",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const identity = await tryReadAnchorAuthenticatedIdentity(c);
      const result = await getAnchorPRBookingSupport(
        id,
        identity?.userId ?? null,
      );
      return c.json(result);
    },
  )
  .get(
    "/:id/alternative-batches",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await recommendAlternativeBatches(id);
      return c.json(result);
    },
  )
  .post(
    "/:id/accept-alternative-batch",
    zValidator("param", prIdParamSchema),
    zValidator("json", acceptAlternativeBatchSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { targetTimeWindow } = c.req.valid("json");
      const result = await acceptAlternativeBatch(id, targetTimeWindow);
      return c.json(result);
    },
  )
  .patch(
    "/:id/status",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateStatusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await ensureAnchorPR(id);
      const { status, pin } = c.req.valid("json");
      const auth = c.get("auth");

      const creatorAuth = await authorizeCreatorMutation(
        id,
        auth,
        "status",
        pin,
      );

      if (creatorAuth.request.status === "DRAFT") {
        throw new HTTPException(400, {
          message: "Use publish endpoint to publish DRAFT partner request",
        });
      }

      if (creatorAuth.upgradedAuth) {
        c.set("auth", creatorAuth.upgradedAuth);
      }

      const result = await updatePRStatus(id, status, creatorAuth.actorUserId);
      return c.json({
        ...result,
        auth: creatorAuth.upgradedAuth
          ? {
              role: creatorAuth.upgradedAuth.role,
              userId: creatorAuth.upgradedAuth.userId,
              userPin: pin ?? null,
              accessToken: creatorAuth.upgradedAuth.token,
            }
          : null,
      });
    },
  )
  .patch(
    "/:id/content",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateContentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await ensureAnchorPR(id);
      const { fields, pin } = c.req.valid("json");
      const auth = c.get("auth");

      const creatorAuth = await authorizeCreatorMutation(
        id,
        auth,
        "content",
        pin,
      );
      if (creatorAuth.upgradedAuth) {
        c.set("auth", creatorAuth.upgradedAuth);
      }

      const result = await updatePRContent(id, fields, creatorAuth.actorUserId);
      return c.json({
        ...result,
        auth: creatorAuth.upgradedAuth
          ? {
              role: creatorAuth.upgradedAuth.role,
              userId: creatorAuth.upgradedAuth.userId,
              userPin: pin ?? null,
              accessToken: creatorAuth.upgradedAuth.token,
            }
          : null,
      });
    },
  )
  .post(
    "/:id/join",
    zValidator("param", prIdParamSchema),
    zValidator("json", anchorJoinSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { bookingContactPhone } = c.req.valid("json");
      await ensureAnchorPR(id);
      const openId = await requireAuthenticatedOpenId(c);
      const result = await joinPR(id, openId, {
        bookingContactPhone: bookingContactPhone ?? null,
      });
      return c.json(result);
    },
  )
  .post("/:id/exit", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await ensureAnchorPR(id);
    const { openId } = await requireAnchorAuthenticatedIdentity(c);
    const result = await exitPR(id, openId);
    return c.json(result);
  })
  .post("/:id/confirm", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await ensureAnchorPR(id);
    const { openId } = await requireAnchorAuthenticatedIdentity(c);
    const result = await confirmSlot(id, openId);
    return c.json(result);
  })
  .put(
    "/:id/booking-contact/phone",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateBookingContactPhoneSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { phone } = c.req.valid("json");
      await ensureAnchorPR(id);
      const { userId } = await requireAnchorAuthenticatedIdentity(c);
      const result = await updateAnchorPRBookingContactPhone({
        prId: id,
        userId,
        phone,
      });
      return c.json(result);
    },
  )
  .post(
    "/:id/check-in",
    zValidator("param", prIdParamSchema),
    zValidator("json", slotCheckInSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await ensureAnchorPR(id);
      const { openId } = await requireAnchorAuthenticatedIdentity(c);
      const { didAttend, wouldJoinAgain } = c.req.valid("json");
      if (didAttend === false) {
        throw new HTTPException(400, {
          message: "didAttend=false is no longer supported",
        });
      }
      const result = await checkIn(id, openId, {
        wouldJoinAgain: wouldJoinAgain ?? null,
      });
      return c.json(result);
    },
  )
  .get(
    "/:id/reimbursement/status",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const userId = requireSessionUserId(c);
      const result = await getReimbursementStatus(id, userId);
      return c.json(result);
    },
  );
