import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import {
  createPRFromStructured,
  createPRFromNaturalLanguage,
  publishPR,
  updatePRStatus,
  updatePRContent,
  joinPR,
  exitPR,
} from "../domains/pr-core";
import { getCommunityPRDetail } from "../domains/pr-community";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { authorizeCreatorMutation } from "../domains/pr-core/services/creator-mutation-auth.service";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import {
  buildCreatorIdentity,
  createStructuredPRSchema,
  issueAuthPayload,
  nlWordCountSchema,
  prIdParamSchema,
  requireAuthenticatedOpenId,
  tryReadAuthenticatedOpenId,
  updateContentSchema,
  updateStatusSchema,
} from "./pr-controller.shared";

const app = new Hono<AuthEnv>();
const prRepo = new PartnerRequestRepository();

const ensureCommunityPR = async (id: number) => {
  const request = await prRepo.findById(id);
  if (!request || request.prKind !== "COMMUNITY") {
    throw new HTTPException(404, { message: "Community PR not found" });
  }
  return request;
};

export const communityPRRoute = app
  .use("*", authMiddleware)
  .post("/", zValidator("json", createStructuredPRSchema), async (c) => {
    const fields = c.req.valid("json");
    const creatorIdentity = await buildCreatorIdentity(c);
    const result = await createPRFromStructured(fields, creatorIdentity);

    return c.json(
      {
        id: result.id,
      },
      201,
    );
  })
  .post(
    "/natural_language",
    zValidator("json", nlWordCountSchema),
    async (c) => {
      const { rawText, nowIso, nowWeekday } = c.req.valid("json");
      const creatorIdentity = await buildCreatorIdentity(c);
      const result = await createPRFromNaturalLanguage(
        rawText,
        nowIso,
        nowWeekday ?? null,
        creatorIdentity,
      );

      return c.json(
        {
          id: result.id,
        },
        201,
      );
    },
  )
  .get("/:id", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const openId = await tryReadAuthenticatedOpenId(c);
    const result = await getCommunityPRDetail(id, openId);
    return c.json(result);
  })
  .post("/:id/publish", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await ensureCommunityPR(id);
    const creatorIdentity = await buildCreatorIdentity(c);
    const result = await publishPR(id, creatorIdentity);

    const auth = issueAuthPayload(c, result.createdBy, result.generatedUserPin);

    return c.json({
      id: result.pr.id,
      pr: result.pr,
      auth,
    });
  })
  .patch(
    "/:id/status",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateStatusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await ensureCommunityPR(id);
      const { status, pin } = c.req.valid("json");
      const auth = c.get("auth");

      const creatorAuth = await authorizeCreatorMutation(id, auth, "status", pin);

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
              role: "authenticated" as const,
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
      await ensureCommunityPR(id);
      const { fields, pin } = c.req.valid("json");
      const auth = c.get("auth");

      const creatorAuth = await authorizeCreatorMutation(id, auth, "content", pin);
      if (creatorAuth.upgradedAuth) {
        c.set("auth", creatorAuth.upgradedAuth);
      }

      const result = await updatePRContent(id, fields, creatorAuth.actorUserId);
      return c.json({
        ...result,
        auth: creatorAuth.upgradedAuth
          ? {
              role: "authenticated" as const,
              userId: creatorAuth.upgradedAuth.userId,
              userPin: pin ?? null,
              accessToken: creatorAuth.upgradedAuth.token,
            }
          : null,
      });
    },
  )
  .post("/:id/join", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await ensureCommunityPR(id);
    const openId = await requireAuthenticatedOpenId(c);
    const result = await joinPR(id, openId);
    return c.json(result);
  })
  .post("/:id/exit", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await ensureCommunityPR(id);
    const openId = await requireAuthenticatedOpenId(c);
    const result = await exitPR(id, openId);
    return c.json(result);
  });
