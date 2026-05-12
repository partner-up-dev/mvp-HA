import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import {
  createNaturalLanguagePRSchema,
  createStructuredPRSchema,
  partnerRequestFieldsSchema,
  prStatusManualSchema,
} from "../entities/partner-request";
import { prMessageBodySchema } from "../entities/pr-message";
import { hasUserRole, type UserId, type UserRole } from "../entities/user";
import { WeChatOAuthService } from "../services/WeChatOAuthService";
import { issueAnonymousAuth, issueAuthForUser } from "../auth/middleware";
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
});

export const updateContentSchema = z.object({
  fields: partnerRequestFieldsSchema,
});

export const anchorUpdateContentFieldsSchema = partnerRequestFieldsSchema.omit({
  time: true,
  budget: true,
});

export const anchorUpdateContentSchema = z.object({
  fields: anchorUpdateContentFieldsSchema,
});

export const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const prPartnerProfileParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  partnerId: z.coerce.number().int().positive(),
});

export const prMessageCreateSchema = z.object({
  body: prMessageBodySchema,
});

export const prMessageReadMarkerSchema = z.object({
  lastReadMessageId: z.coerce.number().int().positive(),
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

export const getSessionUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  if (!auth.userId) {
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
  const auth = c.get("auth");
  if (auth.role === "anonymous") {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  return requireSessionUserId(c);
};

export const buildCreatorIdentity = async (c: Context<AuthEnv>) => {
  const authenticatedUserId = getAuthenticatedUserId(c);
  const sessionUserId = getSessionUserId(c);
  const openId = await tryReadAuthenticatedOpenId(c);

  return {
    authenticatedUserId,
    anonymousUserId: authenticatedUserId === null ? sessionUserId : null,
    oauthOpenId: openId,
  };
};

export const issueAuthPayload = async (
  c: Context<AuthEnv>,
  userId: UserId,
): Promise<{
  role: UserRole;
  roles: UserRole[];
  userId: UserId;
  accessToken: string;
}> => {
  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    throw new HTTPException(401, { message: "Invalid session user" });
  }

  const auth = hasUserRole(user.role, "anonymous")
    ? issueAnonymousAuth(user.id)
    : issueAuthForUser(user);
  c.set("auth", auth);

  return {
    role: auth.role,
    roles: auth.roles,
    userId: user.id,
    accessToken: auth.token,
  };
};

export {
  createStructuredPRSchema,
  createNaturalLanguagePRSchema,
  partnerRequestFieldsSchema,
};
