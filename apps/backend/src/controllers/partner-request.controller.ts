import { Hono } from "hono";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  createPRFromNaturalLanguage,
  createPRFromStructured,
  getPRDetail,
  getPRPartnerProfile,
  getMyCreatedPRs,
  getMyJoinedPRs,
} from "../domains/pr";
import {
  buildCreatorIdentity,
  getAuthenticatedUserId,
  nlWordCountSchema,
  prIdParamSchema,
  prPartnerProfileParamSchema,
  requireAnchorAuthenticatedIdentity,
  requireAuthenticatedUserId,
  resolveAvatarUrl,
  tryReadAuthenticatedOpenId,
  partnerRequestFieldsSchema,
} from "./pr-controller.shared";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono<AuthEnv>();
const createStructuredPRCommandSchema = z.object({
  fields: partnerRequestFieldsSchema,
  createSource: z.enum(["FORM", "EVENT_ASSISTED"]).optional(),
});

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
