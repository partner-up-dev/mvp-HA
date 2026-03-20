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
import type { AuthEnv } from "../auth/middleware";
import { UserRepository } from "../repositories/UserRepository";
import {
  isWeChatAbilityMockingEnabled,
  resolveWeChatAbilityMockOpenId,
} from "../lib/wechat-ability-mocking";

const oauthService = new WeChatOAuthService();
const userRepo = new UserRepository();
const WECHAT_AUTH_REQUIRED_CODE = "WECHAT_AUTH_REQUIRED";
const WECHAT_OAUTH_NOT_CONFIGURED_CODE = "WECHAT_OAUTH_NOT_CONFIGURED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

type CodedHttpException = HTTPException & {
  code?: string;
};

const readBoundOpenId = async (c: Context<AuthEnv>): Promise<string | null> => {
  const userId = getAuthenticatedUserId(c);
  if (!userId) {
    return null;
  }

  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  return user.openId ?? null;
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
  pin: z
    .string()
    .regex(/^\d{4}$/, "PIN must be 4 digits")
    .optional(),
});

export const updateContentSchema = z.object({
  fields: partnerRequestFieldsSchema,
  pin: z
    .string()
    .regex(/^\d{4}$/, "PIN must be 4 digits")
    .optional(),
});

export const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const prPartnerProfileParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  partnerId: z.coerce.number().int().positive(),
});

export const resolveAvatarUrl = (
  requestUrl: string,
  avatarUrl: string | null,
): string | null => {
  if (!avatarUrl) return null;

  try {
    return new URL(avatarUrl).toString();
  } catch {
    return new URL(avatarUrl, requestUrl).toString();
  }
};

export const requireAuthenticatedOpenId = async (
  c: Context<AuthEnv>,
): Promise<string> => {
  const openId = await readBoundOpenId(c);
  if (openId) {
    return openId;
  }

  const mockOpenId = resolveWeChatAbilityMockOpenId();
  if (mockOpenId) {
    return mockOpenId;
  }

  const userId = getAuthenticatedUserId(c);
  if (!userId) {
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
  }

  return throwCodedHttpException(
    401,
    "Current account is not bound to WeChat",
    WECHAT_BIND_REQUIRED_CODE,
  );
};

export const tryReadAuthenticatedOpenId = async (
  c: Context<AuthEnv>,
): Promise<string | null> => {
  return readBoundOpenId(c);
};

type AnchorAuthenticatedIdentity = {
  userId: UserId;
  openId: string;
};

export const tryReadAnchorAuthenticatedIdentity = async (
  c: Context<AuthEnv>,
): Promise<AnchorAuthenticatedIdentity | null> => {
  const userId = getAuthenticatedUserId(c);
  if (!userId) {
    return null;
  }

  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  if (!user.openId) {
    return null;
  }

  return {
    userId,
    openId: user.openId,
  };
};

export const requireAnchorAuthenticatedIdentity = async (
  c: Context<AuthEnv>,
): Promise<AnchorAuthenticatedIdentity> => {
  const userId = getAuthenticatedUserId(c);
  if (!userId) {
    return throwCodedHttpException(
      401,
      "WeChat login required for anchor actions",
      WECHAT_AUTH_REQUIRED_CODE,
    );
  }

  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return throwCodedHttpException(
      401,
      "Invalid authenticated WeChat user",
      WECHAT_AUTH_REQUIRED_CODE,
    );
  }

  if (!user.openId) {
    return throwCodedHttpException(
      401,
      "Current account is not bound to WeChat",
      WECHAT_BIND_REQUIRED_CODE,
    );
  }

  return {
    userId: user.id,
    openId: user.openId,
  };
};

export const getAuthenticatedUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  if (auth.role === "anonymous" || !auth.userId) {
    return null;
  }

  return auth.userId as UserId;
};

export const requireSessionUserId = (c: Context<AuthEnv>): UserId => {
  const auth = c.get("auth");
  if (!auth.userId) {
    throw new HTTPException(401, { message: "Authentication required" });
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
