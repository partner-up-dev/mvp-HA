import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import {
  createNaturalLanguagePRSchema,
  createStructuredPRSchema,
  partnerRequestFieldsSchema,
  prStatusManualSchema,
} from "../entities/partner-request";
import type { UserId } from "../entities/user";
import { WeChatOAuthService } from "../services/WeChatOAuthService";
import { issueUserAuth } from "../auth/middleware";
import { readOAuthSession } from "../auth/wechat-session";
import type { AuthEnv } from "../auth/middleware";
import { env } from "../lib/env";

const oauthService = new WeChatOAuthService();
const isProduction = process.env.NODE_ENV === "production";
const WECHAT_AUTH_REQUIRED_CODE = "WECHAT_AUTH_REQUIRED";
const WECHAT_OAUTH_NOT_CONFIGURED_CODE = "WECHAT_OAUTH_NOT_CONFIGURED";

type CodedHttpException = HTTPException & {
  code?: string;
};

const isWeChatDevMockEnabled = (): boolean =>
  !isProduction && env.WECHAT_DEV_MOCK_ENABLED === "true";

const resolveWeChatDevMockOpenId = (): string | null => {
  if (!isWeChatDevMockEnabled()) {
    return null;
  }

  const openId = env.WECHAT_DEV_MOCK_OPEN_ID.trim();
  return openId.length > 0 ? openId : null;
};

const readSessionOpenId = async (c: Context<AuthEnv>): Promise<string | null> => {
  const sessionPayload = await readOAuthSession(c);
  if (!sessionPayload) {
    return null;
  }

  return sessionPayload.openId;
};

const throwCodedHttpException = (
  status: 401 | 503,
  message: string,
  code: string,
): never => {
  const error = new HTTPException(status, { message }) as CodedHttpException;
  error.code = code;
  throw error;
};

export const nlWordCountSchema = createNaturalLanguagePRSchema.refine(
  ({ rawText }) => rawText.trim().split(/\s+/).filter(Boolean).length <= 50,
  { message: "Natural language input must be 50 words or fewer" },
);

export const updateStatusSchema = z.object({
  status: prStatusManualSchema,
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional(),
});

export const updateContentSchema = z.object({
  fields: partnerRequestFieldsSchema,
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional(),
});

export const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const requireAuthenticatedOpenId = async (
  c: Context<AuthEnv>,
): Promise<string> => {
  const sessionOpenId = await readSessionOpenId(c);
  if (sessionOpenId) {
    return sessionOpenId;
  }

  const mockOpenId = resolveWeChatDevMockOpenId();
  if (mockOpenId) {
    return mockOpenId;
  }

  if (!oauthService.isConfigured()) {
    return throwCodedHttpException(
      503,
      "WeChat OAuth is not configured",
      WECHAT_OAUTH_NOT_CONFIGURED_CODE,
    );
  }

  return throwCodedHttpException(
    401,
    "WeChat login required for partner actions",
    WECHAT_AUTH_REQUIRED_CODE,
  );
};

export const tryReadAuthenticatedOpenId = async (
  c: Context<AuthEnv>,
): Promise<string | null> => {
  return readSessionOpenId(c);
};

export const tryReadAuthenticatedOpenIdForAnchor = async (
  c: Context<AuthEnv>,
): Promise<string | null> => {
  const sessionOpenId = await readSessionOpenId(c);
  if (sessionOpenId) {
    return sessionOpenId;
  }

  return resolveWeChatDevMockOpenId();
};

export const getAuthenticatedUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  if (auth.role === "anonymous" || !auth.userId) {
    return null;
  }

  return auth.userId as UserId;
};

export const requireAuthenticatedUserId = (c: Context<AuthEnv>): UserId => {
  const userId = getAuthenticatedUserId(c);
  if (!userId) {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  return userId;
};

export const buildCreatorIdentity = async (c: Context<AuthEnv>) => {
  const authenticatedUserId = getAuthenticatedUserId(c);
  const openId = await tryReadAuthenticatedOpenId(c);

  return {
    authenticatedUserId,
    oauthOpenId: openId,
  };
};

export const issueAuthPayload = (
  c: Context<AuthEnv>,
  userId: UserId,
  userPin: string | null,
) => {
  const auth = issueUserAuth(userId);
  c.set("auth", auth);

  return {
    role: auth.role,
    userId,
    userPin,
    accessToken: auth.token,
  };
};

export {
  createStructuredPRSchema,
  createNaturalLanguagePRSchema,
  partnerRequestFieldsSchema,
};
