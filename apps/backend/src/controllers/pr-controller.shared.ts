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
import { UserRepository } from "../repositories/UserRepository";
import {
  isWeChatAbilityMockingEnabled,
  resolveWeChatAbilityMockOpenId,
} from "../lib/wechat-ability-mocking";

const oauthService = new WeChatOAuthService();
const userRepo = new UserRepository();
const ANCHOR_USER_AUTH_REQUIRED_CODE = "ANCHOR_USER_AUTH_REQUIRED";
const WECHAT_AUTH_REQUIRED_CODE = "WECHAT_AUTH_REQUIRED";
const WECHAT_OAUTH_NOT_CONFIGURED_CODE = "WECHAT_OAUTH_NOT_CONFIGURED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

type CodedHttpException = HTTPException & {
  code?: string;
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
  const sessionOpenId = await readSessionOpenId(c);
  if (sessionOpenId) {
    return sessionOpenId;
  }

  const mockOpenId = resolveWeChatAbilityMockOpenId();
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

  const openId = await readSessionOpenId(c);
  if (!openId) {
    return null;
  }

  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  if (user.openId !== openId) {
    return null;
  }

  return {
    userId,
    openId,
  };
};

export const requireAnchorAuthenticatedIdentity = async (
  c: Context<AuthEnv>,
): Promise<AnchorAuthenticatedIdentity> => {
  const userId = getAuthenticatedUserId(c);
  if (!userId) {
    return throwCodedHttpException(
      401,
      "Authenticated user required for anchor actions",
      ANCHOR_USER_AUTH_REQUIRED_CODE,
    );
  }

  const sessionOpenId = await readSessionOpenId(c);
  if (!sessionOpenId) {
    if (!oauthService.isConfigured() && !isWeChatAbilityMockingEnabled()) {
      return throwCodedHttpException(
        503,
        "WeChat OAuth is not configured",
        WECHAT_OAUTH_NOT_CONFIGURED_CODE,
      );
    }

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
      "Invalid authenticated user",
      ANCHOR_USER_AUTH_REQUIRED_CODE,
    );
  }

  if (!user.openId) {
    const occupied = await userRepo.findByOpenId(sessionOpenId);
    if (occupied && occupied.id !== user.id) {
      return throwCodedHttpException(
        401,
        "Current account is not bound to this WeChat session",
        WECHAT_BIND_REQUIRED_CODE,
      );
    }

    const bound = await userRepo.bindOpenId(user.id, sessionOpenId);
    if (!bound) {
      throw new HTTPException(500, { message: "Failed to bind WeChat account" });
    }

    return {
      userId: bound.id,
      openId: sessionOpenId,
    };
  }

  if (user.openId !== sessionOpenId) {
    return throwCodedHttpException(
      401,
      "Current account is not bound to this WeChat session",
      WECHAT_BIND_REQUIRED_CODE,
    );
  }

  return {
    userId: user.id,
    openId: sessionOpenId,
  };
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
