import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  checkIn,
  confirmSlot,
  getAnchorPRDetail,
  searchAnchorPRs,
  getAnchorPRBookingSupport,
  getPRPartnerProfile,
  getReimbursementStatus,
  advancePRMessageReadMarker,
  exitPR,
  createPRMessage,
  joinPR,
  listPRMessages,
  updatePRContent,
  updatePRStatus,
  authorizeCreatorMutation,
} from "../domains/pr";
import { updateAnchorPRBookingContactPhone } from "../domains/pr-booking-support";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import { HTTPException } from "hono/http-exception";
import {
  anchorUpdateContentSchema,
  prMessageCreateSchema,
  prMessageReadMarkerSchema,
  prIdParamSchema,
  prPartnerProfileParamSchema,
  requireAnchorAuthenticatedIdentity,
  requireAuthenticatedOpenId,
  requireSessionUserId,
  resolveAvatarUrl,
  tryReadAnchorAuthenticatedIdentity,
  getAuthenticatedUserId,
  updateStatusSchema,
} from "./pr-controller.shared";

const app = new Hono<AuthEnv>();
const prRepo = new PartnerRequestRepository();
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
const slotCheckInSchema = z.object({
  didAttend: z.boolean().optional(),
  wouldJoinAgain: z.boolean().nullable().optional(),
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
  .get("/search", zValidator("query", anchorPRSearchQuerySchema), async (c) => {
    const { eventId, date } = c.req.valid("query");
    const result = await searchAnchorPRs({
      eventId,
      dates: date,
    });
    return c.json(result);
  })
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
    "/:id/messages",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await ensureAnchorPR(id);
      const { userId } = await requireAnchorAuthenticatedIdentity(c);
      const result = await listPRMessages(id, userId);

      return c.json({
        ...result,
        items: result.items.map((item) => ({
          ...item,
          author: {
            ...item.author,
            avatarUrl: resolveAvatarUrl(c.req.url, item.author.avatarUrl),
          },
        })),
      });
    },
  )
  .post(
    "/:id/messages",
    zValidator("param", prIdParamSchema),
    zValidator("json", prMessageCreateSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { body } = c.req.valid("json");
      await ensureAnchorPR(id);
      const { userId } = await requireAnchorAuthenticatedIdentity(c);
      const result = await createPRMessage({
        prId: id,
        authorUserId: userId,
        body,
      });

      return c.json({
        ...result,
        message: {
          ...result.message,
          author: {
            ...result.message.author,
            avatarUrl: resolveAvatarUrl(
              c.req.url,
              result.message.author.avatarUrl,
            ),
          },
        },
      });
    },
  )
  .post(
    "/:id/messages/read-marker",
    zValidator("param", prIdParamSchema),
    zValidator("json", prMessageReadMarkerSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { lastReadMessageId } = c.req.valid("json");
      await ensureAnchorPR(id);
      const { userId } = await requireAnchorAuthenticatedIdentity(c);
      const result = await advancePRMessageReadMarker({
        prId: id,
        userId,
        lastReadMessageId,
      });
      return c.json(result);
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
    zValidator("json", anchorUpdateContentSchema),
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

      const result = await updatePRContent(
        id,
        {
          ...fields,
          time: creatorAuth.request.time,
          budget: null,
        },
        creatorAuth.actorUserId,
      );
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
