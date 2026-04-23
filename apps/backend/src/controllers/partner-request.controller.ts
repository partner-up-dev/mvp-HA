import { Hono } from "hono";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  advancePRMessageReadMarker,
  createPRFromNaturalLanguage,
  createPRFromStructured,
  createPRMessage,
  getPRDetail,
  getAnchorPRBookingSupport,
  getPRPartnerProfile,
  getReimbursementStatus,
  getMyCreatedPRs,
  getMyJoinedPRs,
  listPRMessages,
} from "../domains/pr";
import { updateAnchorPRBookingContactPhone } from "../domains/pr-booking-support";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import {
  buildCreatorIdentity,
  getAuthenticatedUserId,
  nlWordCountSchema,
  prMessageCreateSchema,
  prMessageReadMarkerSchema,
  prIdParamSchema,
  prPartnerProfileParamSchema,
  requireAnchorAuthenticatedIdentity,
  requireAuthenticatedUserId,
  requireSessionUserId,
  resolveAvatarUrl,
  tryReadAnchorAuthenticatedIdentity,
  tryReadAuthenticatedOpenId,
  partnerRequestFieldsSchema,
} from "./pr-controller.shared";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono<AuthEnv>();
const prRepo = new PartnerRequestRepository();
const createStructuredPRCommandSchema = z.object({
  fields: partnerRequestFieldsSchema,
  createSource: z.enum(["FORM", "EVENT_ASSISTED"]).optional(),
});
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

export const partnerRequestRoute = app
  .use("*", authMiddleware)
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
  })
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
  .get("/:id/booking-support", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await ensureAnchorPR(id);
    const identity = await tryReadAnchorAuthenticatedIdentity(c);
    const result = await getAnchorPRBookingSupport(id, identity?.userId ?? null);
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
  .get("/:id/reimbursement/status", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await ensureAnchorPR(id);
    const userId = requireSessionUserId(c);
    const result = await getReimbursementStatus(id, userId);
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
