import { Hono } from "hono";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  advancePRMessageReadMarker,
  authorizeCreatorMutation,
  checkIn,
  confirmSlot,
  createPRFromNaturalLanguage,
  createPRFromStructured,
  createPRMessage,
  exitPRByUserId,
  exitPR,
  getPRDetail,
  getPRBookingSupport,
  getPRPartnerProfile,
  getReimbursementStatus,
  getMyCreatedPRs,
  getMyJoinedPRs,
  joinPRByIdentity,
  joinPR,
  listPRMessages,
  publishPR,
  searchPRs,
  updatePRContent,
  updatePRStatus,
} from "../domains/pr";
import { updatePRBookingContactPhone } from "../domains/pr-booking-support";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import {
  anchorUpdateContentSchema,
  buildCreatorIdentity,
  getAuthenticatedUserId,
  issueAuthPayload,
  nlWordCountSchema,
  prMessageCreateSchema,
  prMessageReadMarkerSchema,
  prIdParamSchema,
  prPartnerProfileParamSchema,
  requireAnchorAuthenticatedIdentity,
  requireAuthenticatedOpenId,
  requireAuthenticatedUserId,
  requireSessionUserId,
  resolveAvatarUrl,
  tryReadAnchorAuthenticatedIdentity,
  tryReadAuthenticatedOpenId,
  partnerRequestFieldsSchema,
  updateContentSchema,
  updateStatusSchema,
} from "./pr-controller.shared";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono<AuthEnv>();
const prRepo = new PartnerRequestRepository();
const isoDateSearchParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const eventPRSearchQuerySchema = z.object({
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
const createStructuredPRCommandSchema = z.object({
  fields: partnerRequestFieldsSchema,
  createSource: z.enum(["FORM", "EVENT_ASSISTED"]).optional(),
});
const canonicalUpdateContentSchema = z.union([
  updateContentSchema,
  anchorUpdateContentSchema,
]);
const anchorJoinSchema = z
  .object({
    bookingContactPhone: z.string().trim().min(1).optional(),
  })
  .default({});
const slotCheckInSchema = z.object({
  didAttend: z.boolean().optional(),
  wouldJoinAgain: z.boolean().nullable().optional(),
});
const updateBookingContactPhoneSchema = z.object({
  phone: z.string().trim().min(1),
});

const getPROr404 = async (id: number) => {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  return request;
};

export const partnerRequestRoute = app
  .use("*", authMiddleware)
  .get("/search", zValidator("query", eventPRSearchQuerySchema), async (c) => {
    const { eventId, date } = c.req.valid("query");
    const result = await searchPRs({
      eventId,
      dates: date,
    });
    return c.json(result);
  })
  .post(
    "/new/form",
    zValidator("json", createStructuredPRCommandSchema),
    async (c) => {
      const { fields, createSource } = c.req.valid("json");

      const creatorIdentity =
        createSource === "EVENT_ASSISTED"
          ? await (async () => {
              const identity = await requireAnchorAuthenticatedIdentity(c);
              return {
                authenticatedUserId: identity.userId,
                oauthOpenId: identity.openId,
              };
            })()
          : await buildCreatorIdentity(c);

      const result = await createPRFromStructured(fields, creatorIdentity, {
        createSource,
      });

      return c.json(result, 201);
    },
  )
  .post("/new/nl", zValidator("json", nlWordCountSchema), async (c) => {
    const { rawText, nowIso, nowWeekday } = c.req.valid("json");
    const creatorIdentity = await buildCreatorIdentity(c);
    const result = await createPRFromNaturalLanguage(
      rawText,
      nowIso,
      nowWeekday ?? null,
      creatorIdentity,
    );

    return c.json(result, 201);
  })
  .post("/:id/publish", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const creatorIdentity = await buildCreatorIdentity(c);
    const result = await publishPR(id, creatorIdentity);
    const auth = issueAuthPayload(c, result.createdBy, result.generatedUserPin);

    return c.json({
      id: result.pr.id,
      pr: result.pr,
      auth,
    });
  })
  .get("/mine/created", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const items = await getMyCreatedPRs(userId);
    return c.json(items);
  })
  .get("/mine/joined", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const items = await getMyJoinedPRs(userId);
    return c.json(items);
  })
  .get("/:id/messages", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const userId = requireSessionUserId(c);
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
  })
  .post(
    "/:id/messages",
    zValidator("param", prIdParamSchema),
    zValidator("json", prMessageCreateSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { body } = c.req.valid("json");
      await getPROr404(id);
      const userId = requireSessionUserId(c);
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
      await getPROr404(id);
      const userId = requireSessionUserId(c);
      const result = await advancePRMessageReadMarker({
        prId: id,
        userId,
        lastReadMessageId,
      });
      return c.json(result);
    },
  )
  .get("/:id/booking-support", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const result = await getPRBookingSupport(id, getAuthenticatedUserId(c));
    return c.json(result);
  })
  .put(
    "/:id/booking-contact/phone",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateBookingContactPhoneSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { phone } = c.req.valid("json");
      await getPROr404(id);
      const userId = requireSessionUserId(c);
      const result = await updatePRBookingContactPhone({
        prId: id,
        userId,
        phone,
      });
      return c.json(result);
    },
  )
  .get("/:id/reimbursement/status", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const userId = requireSessionUserId(c);
    const result = await getReimbursementStatus(id, userId);
    return c.json(result);
  })
  .patch(
    "/:id/status",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateStatusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
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
    zValidator("json", canonicalUpdateContentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const payload = updateContentSchema.parse(c.req.valid("json"));
      const auth = c.get("auth");

      const creatorAuth = await authorizeCreatorMutation(
        id,
        auth,
        "content",
        "pin" in payload ? payload.pin : undefined,
      );
      if (creatorAuth.upgradedAuth) {
        c.set("auth", creatorAuth.upgradedAuth);
      }

      const result = await updatePRContent(
        id,
        payload.fields,
        creatorAuth.actorUserId,
      );
      return c.json({
        ...result,
        auth: creatorAuth.upgradedAuth
          ? {
              role: creatorAuth.upgradedAuth.role,
              userId: creatorAuth.upgradedAuth.userId,
              userPin: payload.pin ?? null,
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
      await getPROr404(id);
      const { bookingContactPhone } = c.req.valid("json");
      const participantIdentity = await buildCreatorIdentity(c);
      const result = await joinPRByIdentity(id, participantIdentity, {
        bookingContactPhone: bookingContactPhone ?? null,
      });
      const auth = issueAuthPayload(c, result.userId, result.generatedUserPin);
      return c.json({
        ...result.pr,
        auth,
      });
    },
  )
  .post("/:id/exit", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const userId = requireAuthenticatedUserId(c);
    const result = await exitPRByUserId(id, userId);
    return c.json(result);
  })
  .post("/:id/confirm", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const { openId } = await requireAnchorAuthenticatedIdentity(c);
    const result = await confirmSlot(id, openId);
    return c.json(result);
  })
  .post(
    "/:id/check-in",
    zValidator("param", prIdParamSchema),
    zValidator("json", slotCheckInSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
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
    "/:id/partners/:partnerId/profile",
    zValidator("param", prPartnerProfileParamSchema),
    async (c) => {
      const { id, partnerId } = c.req.valid("param");
      const viewerUserId = getAuthenticatedUserId(c);
      const profile = await getPRPartnerProfile({
        prId: id,
        partnerId,
        viewerUserId,
      });

      return c.json({
        ...profile,
        avatarUrl: resolveAvatarUrl(c.req.url, profile.avatarUrl),
      });
    },
  )
  .get("/:id", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const openId = await tryReadAuthenticatedOpenId(c);
    const userId = getAuthenticatedUserId(c);
    const result = await getPRDetail(id, { userId, openId });
    return c.json(result);
  });
