import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import {
  createPRFromStructured,
  createPRFromNaturalLanguage,
  getPR,
  getPRSummariesByIds,
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
  prStatusManualSchema,
} from "../entities/partner-request";
import { WeChatOAuthService } from "../services/WeChatOAuthService";

const app = new Hono();
const oauthService = new WeChatOAuthService();
const OAUTH_SESSION_COOKIE_NAME = "wechat_oauth_session";

const oauthSessionCookiePayloadSchema = z.object({
  openId: z.string().min(1),
  issuedAtMs: z.number().int().positive(),
  expiresAtMs: z.number().int().positive(),
});

type OAuthSessionCookiePayload = z.infer<
  typeof oauthSessionCookiePayloadSchema
>;

const nlWordCountSchema = createNaturalLanguagePRSchema.refine(
  ({ rawText }) => rawText.trim().split(/\s+/).filter(Boolean).length <= 50,
  { message: "Natural language input must be 50 words or fewer" },
);

const updateStatusSchema = z.object({
  status: prStatusManualSchema,
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

const updateContentSchema = z.object({
  fields: createStructuredPRSchema.shape.fields,
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

const batchGetSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).max(50),
});

const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const slotCheckInSchema = z.object({
  didAttend: z.boolean(),
  wouldJoinAgain: z.boolean().nullable().optional(),
});

const acceptAlternativeBatchSchema = z.object({
  targetTimeWindow: createStructuredPRSchema.shape.fields.shape.time,
});

const decodeSignedPayload = <T>(
  rawValue: string,
  schema: z.ZodType<T>,
): T | null => {
  try {
    const json = Buffer.from(rawValue, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    const result = schema.safeParse(parsed);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
};

const readOAuthSession = async (
  c: Context,
): Promise<OAuthSessionCookiePayload | null> => {
  if (!oauthService.isConfigured()) {
    return null;
  }

  const sessionSecret = oauthService.getSessionSecret();
  const cookieValue = await getSignedCookie(
    c,
    sessionSecret,
    OAUTH_SESSION_COOKIE_NAME,
  );
  if (!cookieValue) {
    return null;
  }

  return decodeSignedPayload(cookieValue, oauthSessionCookiePayloadSchema);
};

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

export const partnerRequestRoute = app
  // POST /api/pr - Create partner request from structured fields
  .post("/", zValidator("json", createStructuredPRSchema), async (c) => {
    const { fields, pin, status } = c.req.valid("json");
    const openId = await tryReadAuthenticatedOpenId(c);
    const result = await createPRFromStructured(fields, pin, status, openId);
    return c.json(result, 201);
  })
  // POST /api/pr/natural_language - Create partner request from NL text
  .post(
    "/natural_language",
    zValidator("json", nlWordCountSchema),
    async (c) => {
      const { rawText, pin, nowIso, nowWeekday } = c.req.valid("json");
      const openId = await tryReadAuthenticatedOpenId(c);
      const result = await createPRFromNaturalLanguage(
        rawText,
        pin,
        nowIso,
        nowWeekday ?? null,
        openId,
      );
      return c.json(result, 201);
    },
  )
  // POST /api/pr/batch - Batch get partner request summaries
  .post("/batch", zValidator("json", batchGetSchema), async (c) => {
    const { ids } = c.req.valid("json");
    const result = await getPRSummariesByIds(ids);
    return c.json(result);
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
  // PATCH /api/pr/:id/status - Update status
  .patch(
    "/:id/status",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateStatusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { status, pin } = c.req.valid("json");
      const result = await updatePRStatus(id, status, pin);
      return c.json(result);
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
      const result = await updatePRContent(id, fields, pin);
      return c.json(result);
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
