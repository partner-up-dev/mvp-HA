import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import {
  createPRFromStructured,
  createPRFromNaturalLanguage,
  publishPR,
  getMyCreatedPRs,
  getMyJoinedPRs,
  getPR,
  updatePRStatus,
  updatePRContent,
  joinPR,
  exitPR,
  confirmSlot,
  checkIn,
  recommendAlternativeBatches,
  acceptAlternativeBatch,
  getReimbursementStatus,
} from "../domains/pr-core";
import {
  createNaturalLanguagePRSchema,
  createStructuredPRSchema,
  partnerRequestFieldsSchema,
  prStatusManualSchema,
} from "../entities/partner-request";
import type { UserId } from "../entities/user";
import { WeChatOAuthService } from "../services/WeChatOAuthService";
import { authMiddleware, issueAuthenticatedForUser } from "../auth/middleware";
import type { AuthEnv } from "../auth/middleware";
import { readOAuthSession } from "../auth/wechat-session";
import { resolveUserByOpenId } from "../domains/pr-core/services/user-resolver.service";
import { ensureUserHasPin } from "../domains/pr-core/services/user-pin-auth.service";
import { authorizeCreatorMutation } from "../domains/pr-core/services/creator-mutation-auth.service";

const app = new Hono<AuthEnv>();
const oauthService = new WeChatOAuthService();

const nlWordCountSchema = createNaturalLanguagePRSchema.refine(
  ({ rawText }) => rawText.trim().split(/\s+/).filter(Boolean).length <= 50,
  { message: "Natural language input must be 50 words or fewer" },
);

const updateStatusSchema = z.object({
  status: prStatusManualSchema,
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional(),
});

const updateContentSchema = z.object({
  fields: partnerRequestFieldsSchema,
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional(),
});

const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const slotCheckInSchema = z.object({
  didAttend: z.boolean(),
  wouldJoinAgain: z.boolean().nullable().optional(),
});

const acceptAlternativeBatchSchema = z.object({
  targetTimeWindow: partnerRequestFieldsSchema.shape.time,
});

const requireAuthenticatedOpenId = async (c: Context): Promise<string> => {
  if (!oauthService.isConfigured()) {
    throw new HTTPException(503, {
      message: "WeChat OAuth is not configured",
    });
  }

  const sessionPayload = await readOAuthSession(c);
  if (!sessionPayload || sessionPayload.expiresAtMs <= Date.now()) {
    throw new HTTPException(401, {
      message: "WeChat login required for slot actions",
    });
  }

  return sessionPayload.openId;
};

const tryReadAuthenticatedOpenId = async (
  c: Context,
): Promise<string | null> => {
  const sessionPayload = await readOAuthSession(c);
  if (!sessionPayload || sessionPayload.expiresAtMs <= Date.now()) {
    return null;
  }
  return sessionPayload.openId;
};

const getAuthenticatedUserId = (c: Context): UserId | null => {
  const auth = c.get("auth");
  if (auth.role !== "authenticated" || !auth.userId) {
    return null;
  }

  return auth.userId as UserId;
};

const buildCreatorIdentity = async (c: Context) => {
  const authenticatedUserId = getAuthenticatedUserId(c);
  const openId = await tryReadAuthenticatedOpenId(c);

  return {
    authenticatedUserId,
    oauthOpenId: openId,
  };
};

const issueAuthPayload = (
  c: Context,
  userId: UserId,
  userPin: string | null,
) => {
  const auth = issueAuthenticatedForUser(userId);
  c.set("auth", auth);

  return {
    role: "authenticated" as const,
    userId,
    userPin,
    accessToken: auth.token,
  };
};

const requireAuthenticatedUserId = (c: Context): UserId => {
  const userId = getAuthenticatedUserId(c);
  if (!userId) {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  return userId;
};

export const partnerRequestRoute = app
  .use("*", authMiddleware)
  // POST /api/pr - Create partner request from structured fields
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
  // POST /api/pr/natural_language - Create partner request from NL text
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
  // GET /api/pr/mine/created - My created partner requests
  .get("/mine/created", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const items = await getMyCreatedPRs(userId);
    return c.json(items);
  })
  // GET /api/pr/mine/joined - My joined partner requests
  .get("/mine/joined", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const items = await getMyJoinedPRs(userId);
    return c.json(items);
  })
  // GET /api/pr/:id - Get partner request
  .get("/:id", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const openId = await tryReadAuthenticatedOpenId(c);
    const result = await getPR(id, openId);
    return c.json(result);
  })
  // GET /api/pr/:id/alternative-batches - Recommend alternative batches (different time window, same location)
  .get(
    "/:id/alternative-batches",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await recommendAlternativeBatches(id);
      return c.json(result);
    },
  )
  // POST /api/pr/:id/accept-alternative-batch - Accept recommendation (create batch/PR only)
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
  // POST /api/pr/:id/publish - Claim and publish draft request
  .post("/:id/publish", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const creatorIdentity = await buildCreatorIdentity(c);
    const result = await publishPR(id, creatorIdentity);

    const auth = issueAuthPayload(c, result.createdBy, result.generatedUserPin);

    return c.json({
      id: result.pr.id,
      pr: result.pr,
      auth,
    });
  })
  // PATCH /api/pr/:id/status - Update status
  .patch(
    "/:id/status",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateStatusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
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
  // PATCH /api/pr/:id/content - Update content
  .patch(
    "/:id/content",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateContentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
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
  // POST /api/pr/:id/join - Join partner request
  .post("/:id/join", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const openId = await requireAuthenticatedOpenId(c);
    const result = await joinPR(id, openId);
    return c.json(result);
  })
  // POST /api/pr/:id/exit - Exit partner request
  .post("/:id/exit", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const openId = await requireAuthenticatedOpenId(c);
    const result = await exitPR(id, openId);
    return c.json(result);
  })
  // POST /api/pr/:id/confirm - Confirm slot participation
  .post("/:id/confirm", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const openId = await requireAuthenticatedOpenId(c);
    const result = await confirmSlot(id, openId);
    return c.json(result);
  })
  // POST /api/pr/:id/check-in - Optional post-event attendance report
  .post(
    "/:id/check-in",
    zValidator("param", prIdParamSchema),
    zValidator("json", slotCheckInSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const openId = await requireAuthenticatedOpenId(c);
      const { didAttend, wouldJoinAgain } = c.req.valid("json");
      const result = await checkIn(id, openId, {
        didAttend,
        wouldJoinAgain: wouldJoinAgain ?? null,
      });
      return c.json(result);
    },
  )
  // GET /api/pr/:id/reimbursement/status - Reimbursement eligibility and status
  .get(
    "/:id/reimbursement/status",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const openId = await requireAuthenticatedOpenId(c);
      const result = await getReimbursementStatus(id, openId);
      return c.json(result);
    },
  );
