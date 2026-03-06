import { getSignedCookie } from "hono/cookie";
import { z } from "zod";
import type { Context } from "hono";
import { WeChatOAuthService } from "../services/WeChatOAuthService";

const oauthService = new WeChatOAuthService();
const OAUTH_SESSION_COOKIE_NAME = "wechat_oauth_session";

const oauthSessionCookiePayloadSchema = z.object({
  openId: z.string().min(1),
  issuedAtMs: z.number().int().positive(),
  expiresAtMs: z.number().int().positive(),
});

export type OAuthSessionCookiePayload = z.infer<
  typeof oauthSessionCookiePayloadSchema
>;

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

export const readOAuthSession = async (
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

  const session = decodeSignedPayload(
    cookieValue,
    oauthSessionCookiePayloadSchema,
  );
  if (!session || session.expiresAtMs <= Date.now()) {
    return null;
  }

  return session;
};
