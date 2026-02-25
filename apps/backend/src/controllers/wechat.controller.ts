import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { env } from "../lib/env";
import { WeChatJssdkService } from "../services/WeChatJssdkService";
import { WeChatLoginService } from "../services/WeChatLoginService";
import { WeChatOAuthService } from "../services/WeChatOAuthService";

const app = new Hono();
const jssdkService = new WeChatJssdkService();
const oauthService = new WeChatOAuthService();
const loginService = new WeChatLoginService();

const OAUTH_STATE_COOKIE_NAME = "wechat_oauth_state";
const OAUTH_SESSION_COOKIE_NAME = "wechat_oauth_session";
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const OAUTH_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const signatureQuerySchema = z.object({
  url: z.string().min(1),
});

const oauthLoginQuerySchema = z.object({
  returnTo: z.string().optional(),
});

const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});

const oauthStateCookiePayloadSchema = z.object({
  nonce: z.string().min(1),
  returnTo: z.string().url(),
  expiresAtMs: z.number().int().positive(),
});

const oauthSessionCookiePayloadSchema = z.object({
  openId: z.string().min(1),
  issuedAtMs: z.number().int().positive(),
  expiresAtMs: z.number().int().positive(),
});

type OAuthStateCookiePayload = z.infer<typeof oauthStateCookiePayloadSchema>;
type OAuthSessionCookiePayload = z.infer<typeof oauthSessionCookiePayloadSchema>;

const nowMs = (): number => Date.now();

const isHttpProtocol = (protocol: string): boolean =>
  protocol === "http:" || protocol === "https:";

const parseHttpUrl = (rawUrl: string | undefined): URL | null => {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    if (!isHttpProtocol(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const isSecureRequest = (c: Context): boolean => {
  const forwardedProto = c.req.header("x-forwarded-proto");
  const normalizedForwardedProto = forwardedProto
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (normalizedForwardedProto === "https") return true;

  try {
    return new URL(c.req.url).protocol === "https:";
  } catch {
    return false;
  }
};

const resolveCookieBaseOptions = (c: Context) => ({
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: isSecureRequest(c),
  path: "/",
});

const encodeSignedPayload = (payload: object): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

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

const readSignedCookiePayload = async <T>(
  c: Context,
  cookieName: string,
  secret: string,
  schema: z.ZodType<T>,
): Promise<T | null> => {
  const cookieValue = await getSignedCookie(c, secret, cookieName);
  if (!cookieValue) {
    return null;
  }

  return decodeSignedPayload(cookieValue, schema);
};

const clearOAuthStateCookie = (c: Context): void => {
  deleteCookie(c, OAUTH_STATE_COOKIE_NAME, resolveCookieBaseOptions(c));
};

const clearOAuthSessionCookie = (c: Context): void => {
  deleteCookie(c, OAUTH_SESSION_COOKIE_NAME, resolveCookieBaseOptions(c));
};

const collectAllowedReturnToOrigins = (c: Context): Set<string> => {
  const origins = new Set<string>();

  const requestUrl = parseHttpUrl(c.req.url);
  if (requestUrl) {
    origins.add(requestUrl.origin);
  }

  const frontendUrl = parseHttpUrl(env.FRONTEND_URL);
  if (frontendUrl) {
    origins.add(frontendUrl.origin);
  }

  const originHeader = parseHttpUrl(c.req.header("origin"));
  if (originHeader) {
    origins.add(originHeader.origin);
  }

  const refererHeader = parseHttpUrl(c.req.header("referer"));
  if (refererHeader) {
    origins.add(refererHeader.origin);
  }

  return origins;
};

const resolveFallbackReturnTo = (c: Context): string => {
  const referer = parseHttpUrl(c.req.header("referer"));
  if (referer) {
    return referer.toString();
  }

  const frontendUrl = parseHttpUrl(env.FRONTEND_URL);
  if (frontendUrl) {
    return frontendUrl.toString();
  }

  const requestUrl = new URL(c.req.url);
  requestUrl.pathname = "/";
  requestUrl.search = "";
  requestUrl.hash = "";
  return requestUrl.toString();
};

const resolveReturnTo = (
  rawReturnTo: string | undefined,
  c: Context,
): string => {
  const trimmedReturnTo = rawReturnTo?.trim();
  if (!trimmedReturnTo) {
    return resolveFallbackReturnTo(c);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmedReturnTo, new URL(c.req.url).origin);
  } catch {
    throw new Error("Invalid returnTo");
  }

  if (!isHttpProtocol(parsed.protocol)) {
    throw new Error("Invalid returnTo protocol");
  }

  const allowedOrigins = collectAllowedReturnToOrigins(c);
  if (allowedOrigins.size > 0 && !allowedOrigins.has(parsed.origin)) {
    throw new Error("returnTo origin is not allowed");
  }

  return parsed.toString();
};

const resolveOAuthCallbackUrl = (c: Context): string => {
  const callbackUrl = new URL(c.req.url);
  callbackUrl.pathname = callbackUrl.pathname.replace(
    /\/oauth\/login$/,
    "/oauth/callback",
  );
  callbackUrl.search = "";
  callbackUrl.hash = "";
  return callbackUrl.toString();
};

export const wechatRoute = app
  .get("/jssdk-signature", zValidator("query", signatureQuerySchema), async (c) => {
    const { url } = c.req.valid("query");
    try {
      // Validate URL early to return 400 rather than 500.
      // WeChat signature uses the full URL without hash.
      new URL(url);
    } catch {
      return c.json({ error: "Invalid url" }, 400);
    }

    try {
      const signature = await jssdkService.createSignature(url);
      return c.json(signature);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "WeChat signature failed";
      return c.json({ error: message }, 500);
    }
  })
  .get("/oauth/session", async (c) => {
    if (!oauthService.isConfigured()) {
      clearOAuthSessionCookie(c);
      clearOAuthStateCookie(c);
      return c.json({
        configured: false,
        authenticated: false,
        openId: null,
      });
    }

    const sessionSecret = oauthService.getSessionSecret();
    const sessionPayload = await readSignedCookiePayload(
      c,
      OAUTH_SESSION_COOKIE_NAME,
      sessionSecret,
      oauthSessionCookiePayloadSchema,
    );

    if (!sessionPayload || sessionPayload.expiresAtMs <= nowMs()) {
      clearOAuthSessionCookie(c);
      return c.json({
        configured: true,
        authenticated: false,
        openId: null,
      });
    }

    return c.json({
      configured: true,
      authenticated: true,
      openId: sessionPayload.openId,
    });
  })
  .get("/oauth/login", zValidator("query", oauthLoginQuerySchema), async (c) => {
    if (!oauthService.isConfigured()) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }

    const { returnTo: rawReturnTo } = c.req.valid("query");

    let returnTo: string;
    try {
      returnTo = resolveReturnTo(rawReturnTo, c);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid returnTo";
      return c.json({ error: message }, 400);
    }

    const statePayload: OAuthStateCookiePayload = {
      nonce: randomUUID(),
      returnTo,
      expiresAtMs: nowMs() + OAUTH_STATE_TTL_SECONDS * 1000,
    };

    const sessionSecret = oauthService.getSessionSecret();
    await setSignedCookie(
      c,
      OAUTH_STATE_COOKIE_NAME,
      encodeSignedPayload(statePayload),
      sessionSecret,
      {
        ...resolveCookieBaseOptions(c),
        maxAge: OAUTH_STATE_TTL_SECONDS,
      },
    );

    const callbackUrl = resolveOAuthCallbackUrl(c);
    const authorizeUrl = oauthService.createAuthorizeUrl(
      callbackUrl,
      statePayload.nonce,
    );

    return c.redirect(authorizeUrl, 302);
  })
  .get(
    "/oauth/callback",
    zValidator("query", oauthCallbackQuerySchema),
    async (c) => {
      if (!oauthService.isConfigured()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const { code, state } = c.req.valid("query");
      if (!code || !state) {
        clearOAuthStateCookie(c);
        return c.json({ error: "Missing code or state" }, 400);
      }

      const sessionSecret = oauthService.getSessionSecret();
      const statePayload = await readSignedCookiePayload(
        c,
        OAUTH_STATE_COOKIE_NAME,
        sessionSecret,
        oauthStateCookiePayloadSchema,
      );

      if (!statePayload) {
        clearOAuthStateCookie(c);
        return c.json({ error: "Invalid OAuth state" }, 400);
      }

      if (statePayload.expiresAtMs <= nowMs()) {
        clearOAuthStateCookie(c);
        return c.json({ error: "OAuth state expired" }, 400);
      }

      if (statePayload.nonce !== state) {
        clearOAuthStateCookie(c);
        return c.json({ error: "OAuth state mismatch" }, 400);
      }

      try {
        const { openId } = await loginService.exchangeCodeAndEnsureUser(code);
        const issuedAtMs = nowMs();
        const sessionPayload: OAuthSessionCookiePayload = {
          openId,
          issuedAtMs,
          expiresAtMs: issuedAtMs + OAUTH_SESSION_TTL_SECONDS * 1000,
        };

        await setSignedCookie(
          c,
          OAUTH_SESSION_COOKIE_NAME,
          encodeSignedPayload(sessionPayload),
          sessionSecret,
          {
            ...resolveCookieBaseOptions(c),
            maxAge: OAUTH_SESSION_TTL_SECONDS,
          },
        );

        clearOAuthStateCookie(c);
        return c.redirect(statePayload.returnTo, 302);
      } catch (error) {
        clearOAuthStateCookie(c);
        const message =
          error instanceof Error ? error.message : "WeChat OAuth callback failed";
        return c.json({ error: message }, 500);
      }
    },
  )
  .post("/oauth/logout", async (c) => {
    clearOAuthSessionCookie(c);
    clearOAuthStateCookie(c);
    return c.json({ ok: true });
  });
