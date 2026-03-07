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
import { issueAuthenticatedForUser } from "../auth/middleware";
import { readOAuthSession } from "../auth/wechat-session";
import type { AuthEnv } from "../auth/middleware";

const oauthService = new WeChatOAuthService();

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
  if (!oauthService.isConfigured()) {
    throw new HTTPException(503, {
      message: "WeChat OAuth is not configured",
    });
  }

  const sessionPayload = await readOAuthSession(c);
  if (!sessionPayload || sessionPayload.expiresAtMs <= Date.now()) {
    throw new HTTPException(401, {
      message: "WeChat login required for partner actions",
    });
  }

  return sessionPayload.openId;
};

export const tryReadAuthenticatedOpenId = async (
  c: Context<AuthEnv>,
): Promise<string | null> => {
  const sessionPayload = await readOAuthSession(c);
  if (!sessionPayload || sessionPayload.expiresAtMs <= Date.now()) {
    return null;
  }
  return sessionPayload.openId;
};

export const getAuthenticatedUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  if (auth.role !== "authenticated" || !auth.userId) {
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
  const auth = issueAuthenticatedForUser(userId);
  c.set("auth", auth);

  return {
    role: "authenticated" as const,
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
