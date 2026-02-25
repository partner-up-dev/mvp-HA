import crypto from "crypto";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { env } from "../lib/env";
import { WeChatJssdkService } from "../services/WeChatJssdkService";
import { WeChatOAuthService } from "../services/WeChatOAuthService";
import {
  WeChatAuthSessionService,
  type WeChatSessionPayload,
} from "../services/WeChatAuthSessionService";

const app = new Hono();
const jssdkService = new WeChatJssdkService();
const oauthService = new WeChatOAuthService();
const sessionService = new WeChatAuthSessionService();

const WECHAT_SESSION_COOKIE = "pu_wechat_session";
const WECHAT_OAUTH_STATE_COOKIE = "pu_wechat_oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

const frontendOrigins = (env.FRONTEND_URL ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .flatMap((item) => {
    try {
      return [new URL(item).origin];
    } catch {
      return [];
    }
  });

const signatureQuerySchema = z.object({
  url: z.string().min(1),
});

const oauthLoginQuerySchema = z.object({
  returnTo: z.string().optional(),
});

const oauthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
});

const getFirstForwardedValue = (rawValue: string | undefined): string | null => {
  if (!rawValue) return null;
  const firstValue = rawValue.split(",")[0]?.trim();
  return firstValue ? firstValue : null;
};

const getRequestOrigin = (c: Context): string => {
  const reqUrl = new URL(c.req.url);
  const forwardedHost = getFirstForwardedValue(c.req.header("x-forwarded-host"));
  const forwardedProto = getFirstForwardedValue(
    c.req.header("x-forwarded-proto"),
  );

  if (forwardedHost) {
    const proto = forwardedProto ?? reqUrl.protocol.replace(":", "");
    return `${proto}://${forwardedHost}`;
  }

  return reqUrl.origin;
};

const getRefererOrigin = (c: Context): string | null => {
  const referer = c.req.header("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const getDefaultReturnTo = (c: Context): string => {
  const fallbackOrigin = frontendOrigins[0] ?? getRequestOrigin(c);
  return new URL("/", fallbackOrigin).toString();
};

const normalizeReturnTo = (rawReturnTo: string | undefined, c: Context): string => {
  const fallbackReturnTo = getDefaultReturnTo(c);
  if (!rawReturnTo) return fallbackReturnTo;

  const trimmed = rawReturnTo.trim();
  if (!trimmed) return fallbackReturnTo;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const baseOrigin =
      getRefererOrigin(c) ?? frontendOrigins[0] ?? getRequestOrigin(c);
    return new URL(trimmed, baseOrigin).toString();
  }

  try {
    const parsedUrl = new URL(trimmed);
    const allowedOrigins = new Set<string>([
      ...frontendOrigins,
      getRequestOrigin(c),
    ]);

    const refererOrigin = getRefererOrigin(c);
    if (refererOrigin) {
      allowedOrigins.add(refererOrigin);
    }

    if (!allowedOrigins.has(parsedUrl.origin)) {
      return fallbackReturnTo;
    }

    return parsedUrl.toString();
  } catch {
    return fallbackReturnTo;
  }
};

const isHttpsRequest = (c: Context): boolean => {
  const forwardedProto = getFirstForwardedValue(
    c.req.header("x-forwarded-proto"),
  );
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return new URL(c.req.url).protocol === "https:";
};

const setAuthCookie = (
  c: Context,
  name: string,
  value: string,
  maxAgeSeconds: number,
): void => {
  const secure = isHttpsRequest(c);
  setCookie(c, name, value, {
    httpOnly: true,
    secure,
    sameSite: secure ? "None" : "Lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
};

const clearAuthCookies = (c: Context): void => {
  deleteCookie(c, WECHAT_SESSION_COOKIE, { path: "/" });
  deleteCookie(c, WECHAT_OAUTH_STATE_COOKIE, { path: "/" });
};

const getCurrentSession = (c: Context): WeChatSessionPayload | null => {
  const sessionToken = getCookie(c, WECHAT_SESSION_COOKIE);
  if (!sessionToken) return null;

  return sessionService.parseSessionToken(sessionToken);
};

const isOAuthConfigured = (): boolean =>
  oauthService.isConfigured() && sessionService.isConfigured();

export const wechatRoute = app
  .get(
    "/jssdk-signature",
    zValidator("query", signatureQuerySchema),
    async (c) => {
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
    },
  )
  .get("/oauth/session", async (c) => {
    if (!isOAuthConfigured()) {
      return c.json({
        configured: false,
        authenticated: false,
        user: null,
      });
    }

    const session = getCurrentSession(c);
    if (!session) {
      return c.json({
        configured: true,
        authenticated: false,
        user: null,
      });
    }

    return c.json({
      configured: true,
      authenticated: true,
      user: {
        provider: "wechat" as const,
        openId: session.openId,
        unionId: session.unionId,
      },
    });
  })
  .get(
    "/oauth/login",
    zValidator("query", oauthLoginQuerySchema),
    async (c) => {
      if (!isOAuthConfigured()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const { returnTo: rawReturnTo } = c.req.valid("query");
      const returnTo = normalizeReturnTo(rawReturnTo, c);

      const currentSession = getCurrentSession(c);
      if (currentSession) {
        return c.redirect(returnTo);
      }

      const state = crypto.randomBytes(16).toString("hex");
      const loginStateToken = sessionService.createLoginStateToken({
        state,
        returnTo,
        createdAt: Date.now(),
      });

      setAuthCookie(
        c,
        WECHAT_OAUTH_STATE_COOKIE,
        loginStateToken,
        OAUTH_STATE_MAX_AGE_SECONDS,
      );

      const callbackUrl = new URL(
        "/api/wechat/oauth/callback",
        getRequestOrigin(c),
      ).toString();

      const authorizeUrl = oauthService.createAuthorizeUrl(callbackUrl, state);

      return c.redirect(authorizeUrl);
    },
  )
  .get(
    "/oauth/callback",
    zValidator("query", oauthCallbackQuerySchema),
    async (c) => {
      if (!isOAuthConfigured()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const { code, state } = c.req.valid("query");
      if (!code || !state) {
        clearAuthCookies(c);
        return c.json({ error: "Missing code or state" }, 400);
      }

      const loginStateToken = getCookie(c, WECHAT_OAUTH_STATE_COOKIE);
      if (!loginStateToken) {
        clearAuthCookies(c);
        return c.json({ error: "Missing OAuth state" }, 400);
      }

      const parsedState = sessionService.parseLoginStateToken(loginStateToken);
      if (!parsedState) {
        clearAuthCookies(c);
        return c.json({ error: "Invalid OAuth state" }, 400);
      }

      const stateExpiredAt =
        parsedState.createdAt + OAUTH_STATE_MAX_AGE_SECONDS * 1000;
      if (stateExpiredAt <= Date.now()) {
        clearAuthCookies(c);
        return c.json({ error: "OAuth state expired" }, 400);
      }

      if (parsedState.state !== state) {
        clearAuthCookies(c);
        return c.json({ error: "OAuth state mismatch" }, 400);
      }

      try {
        const profile = await oauthService.exchangeCodeForOpenId(code);
        const issuedAt = Date.now();
        const expiresAt = issuedAt + SESSION_MAX_AGE_SECONDS * 1000;

        const sessionToken = sessionService.createSessionToken({
          openId: profile.openId,
          unionId: profile.unionId,
          issuedAt,
          expiresAt,
        });

        setAuthCookie(c, WECHAT_SESSION_COOKIE, sessionToken, SESSION_MAX_AGE_SECONDS);
        deleteCookie(c, WECHAT_OAUTH_STATE_COOKIE, { path: "/" });

        return c.redirect(parsedState.returnTo);
      } catch (error) {
        clearAuthCookies(c);
        const message =
          error instanceof Error ? error.message : "WeChat OAuth callback failed";
        return c.json({ error: message }, 500);
      }
    },
  )
  .post("/oauth/logout", async (c) => {
    clearAuthCookies(c);
    return c.json({ ok: true });
  });
