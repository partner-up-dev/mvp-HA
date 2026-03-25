import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "crypto";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import {
  authMiddleware,
  issueAuthForUser,
  type AuthEnv,
} from "../auth/middleware";
import { env } from "../lib/env";
import {
  isWeChatAbilityMockingEnabled,
  resolveWeChatAbilityMockOpenId,
} from "../lib/wechat-ability-mocking";
import { WeChatJssdkService } from "../services/WeChatJssdkService";
import {
  WeChatOAuthService,
  type WeChatOAuthUserProfile,
} from "../services/WeChatOAuthService";
import { WeChatPhoneService } from "../services/WeChatPhoneService";
import { UserRepository } from "../repositories/UserRepository";
import { UserNotificationOptRepository } from "../repositories/UserNotificationOptRepository";
import { bindWeChatToCurrentUser } from "../domains/user/use-cases/current-user";
import { upgradeAnonymousUserWithWeChat } from "../domains/user/use-cases/upgrade-anonymous-user";
import { ensureUserHasPin } from "../domains/pr-core/services/user-pin-auth.service";
import {
  clearAnonymousSessionCookie,
  readAnonymousSessionCookie,
} from "../auth/anonymous-session";
import {
  cancelWeChatNewPartnerJobsForUser,
  cancelWeChatReminderJobsForUser,
  rebuildWeChatReminderJobsForUser,
} from "../infra/notifications";
import type { User, UserId } from "../entities/user";
import {
  wechatNotificationKindSchema,
  type WeChatNotificationKind,
} from "../entities/user-notification-opt";
import { WeChatSubscriptionMessageService } from "../services/WeChatSubscriptionMessageService";
import { WeChatTemplateMessageService } from "../services/WeChatTemplateMessageService";

const app = new Hono<AuthEnv>();
const jssdkService = new WeChatJssdkService();
const oauthService = new WeChatOAuthService();
const phoneService = new WeChatPhoneService();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const subscriptionMessageService = new WeChatSubscriptionMessageService();
const templateMessageService = new WeChatTemplateMessageService();

const OAUTH_STATE_COOKIE_NAME = "wechat_oauth_state";
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const OAUTH_MOCK_CODE = "mock-oauth-code";
const ANCHOR_USER_AUTH_REQUIRED_CODE = "ANCHOR_USER_AUTH_REQUIRED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

const signatureQuerySchema = z.object({
  url: z.string().min(1),
});

const oauthLoginQuerySchema = z.object({
  returnTo: z.string().optional(),
});

const oauthMockAuthorizeQuerySchema = z.object({
  state: z.string().min(1),
});

const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});

const oauthStateCookiePayloadSchema = z.object({
  nonce: z.string().min(1),
  returnTo: z.string().url(),
  mode: z.enum(["login", "bind"]),
  bindUserId: z.string().uuid().nullable(),
  anonymousUserId: z.string().uuid().nullable(),
  expiresAtMs: z.number().int().positive(),
});
const reminderSubscriptionUpdateSchema = z.object({
  enabled: z.boolean(),
});
const notificationSubscriptionUpdateSchema = z.object({
  kind: wechatNotificationKindSchema,
  enabled: z.boolean(),
});
const resolvePhoneSchema = z.object({
  credential: z.string().trim().min(1),
});

type OAuthStateCookiePayload = z.infer<typeof oauthStateCookiePayloadSchema>;
type OAuthStateMode = OAuthStateCookiePayload["mode"];
type NotificationSubscriptionState = {
  enabled: boolean;
  optInAt: string | null;
  configured: boolean;
  requiresOpenSubscribe: boolean;
  templateId: string | null;
};

const nowMs = (): number => Date.now();

const isOAuthRuntimeAvailable = (): boolean =>
  oauthService.isConfigured() || isWeChatAbilityMockingEnabled();

const resolveOAuthSessionSecret = (): string | null => {
  if (oauthService.isConfigured()) {
    return oauthService.getSessionSecret();
  }
  if (isWeChatAbilityMockingEnabled()) {
    return env.AUTH_JWT_SECRET;
  }
  return null;
};

const buildNotificationChannelState = async (): Promise<{
  reminder: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  bookingResult: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
  newPartner: Pick<
    NotificationSubscriptionState,
    "configured" | "requiresOpenSubscribe" | "templateId"
  >;
}> => {
  const [reminderTemplateId, newPartnerTemplateId] = await Promise.all([
    subscriptionMessageService.getConfirmationReminderTemplateId(),
    subscriptionMessageService.getNewPartnerTemplateId(),
  ]);

  const [reminderSubmsgConfigured, newPartnerSubmsgConfigured] =
    await Promise.all([
      subscriptionMessageService.isConfirmationReminderConfigured(),
      subscriptionMessageService.isNewPartnerConfigured(),
    ]);

  return {
    reminder: {
      configured:
        reminderSubmsgConfigured || templateMessageService.isReminderConfigured(),
      requiresOpenSubscribe:
        reminderSubmsgConfigured && Boolean(reminderTemplateId),
      templateId: reminderTemplateId,
    },
    bookingResult: {
      configured: true,
      requiresOpenSubscribe: false,
      templateId: null,
    },
    newPartner: {
      configured: newPartnerSubmsgConfigured,
      requiresOpenSubscribe:
        newPartnerSubmsgConfigured && Boolean(newPartnerTemplateId),
      templateId: newPartnerTemplateId,
    },
  };
};

const buildAnonymousSubscriptionsResponse = async (configured: boolean) => {
  const channels = await buildNotificationChannelState();

  return {
    configured,
    authenticated: false,
    wechatBound: false,
    subscriptions: {
      REMINDER_CONFIRMATION: {
        enabled: false,
        optInAt: null,
        configured: channels.reminder.configured,
        requiresOpenSubscribe: channels.reminder.requiresOpenSubscribe,
        templateId: channels.reminder.templateId,
      },
      BOOKING_RESULT: {
        enabled: false,
        optInAt: null,
        configured: channels.bookingResult.configured,
        requiresOpenSubscribe: channels.bookingResult.requiresOpenSubscribe,
        templateId: channels.bookingResult.templateId,
      },
      NEW_PARTNER: {
        enabled: false,
        optInAt: null,
        configured: channels.newPartner.configured,
        requiresOpenSubscribe: channels.newPartner.requiresOpenSubscribe,
        templateId: channels.newPartner.templateId,
      },
    },
  };
};

const buildAuthenticatedSubscriptionsResponse = async (
  userId: UserId,
): Promise<{
  configured: boolean;
  authenticated: boolean;
  wechatBound: boolean;
  subscriptions: Record<WeChatNotificationKind, NotificationSubscriptionState>;
}> => {
  const notificationOpt = await userNotificationOptRepo.findByUserId(userId);
  const channels = await buildNotificationChannelState();

  const reminder = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "REMINDER_CONFIRMATION",
  );
  const bookingResult = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "BOOKING_RESULT",
  );
  const newPartner = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    "NEW_PARTNER",
  );

  return {
    configured: true,
    authenticated: true,
    wechatBound: true,
    subscriptions: {
      REMINDER_CONFIRMATION: {
        enabled: reminder.enabled,
        optInAt: reminder.optInAt ? reminder.optInAt.toISOString() : null,
        configured: channels.reminder.configured,
        requiresOpenSubscribe: channels.reminder.requiresOpenSubscribe,
        templateId: channels.reminder.templateId,
      },
      BOOKING_RESULT: {
        enabled: bookingResult.enabled,
        optInAt: bookingResult.optInAt
          ? bookingResult.optInAt.toISOString()
          : null,
        configured: channels.bookingResult.configured,
        requiresOpenSubscribe: channels.bookingResult.requiresOpenSubscribe,
        templateId: channels.bookingResult.templateId,
      },
      NEW_PARTNER: {
        enabled: newPartner.enabled,
        optInAt: newPartner.optInAt ? newPartner.optInAt.toISOString() : null,
        configured: channels.newPartner.configured,
        requiresOpenSubscribe: channels.newPartner.requiresOpenSubscribe,
        templateId: channels.newPartner.templateId,
      },
    },
  };
};

const applyNotificationSubscriptionSideEffects = async (
  userId: UserId,
  kind: WeChatNotificationKind,
  enabled: boolean,
): Promise<number> => {
  if (kind === "REMINDER_CONFIRMATION") {
    if (enabled) {
      await rebuildWeChatReminderJobsForUser(userId);
      return 0;
    }
    return cancelWeChatReminderJobsForUser(userId);
  }

  if (kind === "NEW_PARTNER" && !enabled) {
    return cancelWeChatNewPartnerJobsForUser(userId);
  }

  return 0;
};

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

const resolveOAuthStateCookieName = (nonce: string): string =>
  `${OAUTH_STATE_COOKIE_NAME}_${nonce}`;

const clearOAuthStateCookieByNonce = (c: Context, nonce: string): void => {
  deleteCookie(
    c,
    resolveOAuthStateCookieName(nonce),
    resolveCookieBaseOptions(c),
  );
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
  const frontendUrl = parseHttpUrl(env.FRONTEND_URL);
  if (frontendUrl) {
    const frontendCallbackUrl = new URL(frontendUrl);
    frontendCallbackUrl.pathname = "/wechat/oauth/callback";
    frontendCallbackUrl.search = "";
    frontendCallbackUrl.hash = "";
    return frontendCallbackUrl.toString();
  }

  const backendCallbackUrl = new URL(c.req.url);
  backendCallbackUrl.pathname = backendCallbackUrl.pathname.replace(
    /\/oauth\/(?:login|bind)$/,
    "/oauth/callback",
  );
  backendCallbackUrl.search = "";
  backendCallbackUrl.hash = "";
  return backendCallbackUrl.toString();
};

const resolveMockOAuthAuthorizeUrl = (c: Context, state: string): string => {
  const authorizeUrl = new URL(c.req.url);
  authorizeUrl.pathname = authorizeUrl.pathname.replace(
    /\/oauth\/(?:login|bind)$/,
    "/oauth/mock/authorize",
  );
  authorizeUrl.search = "";
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.hash = "";
  return authorizeUrl.toString();
};

const resolveMockOAuthCallbackUrl = (c: Context, state: string): string => {
  const callbackUrl = new URL(c.req.url);
  callbackUrl.pathname = callbackUrl.pathname.replace(
    /\/oauth\/mock\/authorize$/,
    "/oauth/callback",
  );
  callbackUrl.search = "";
  callbackUrl.searchParams.set("state", state);
  callbackUrl.searchParams.set("code", OAUTH_MOCK_CODE);
  callbackUrl.hash = "";
  return callbackUrl.toString();
};

const appendBindResultToReturnTo = (
  returnTo: string,
  result: "success" | "conflict" | "failed",
): string => {
  const url = new URL(returnTo);
  url.searchParams.set("wechatBind", result);
  return url.toString();
};

const setOAuthStateCookie = async (
  c: Context,
  payload: OAuthStateCookiePayload,
): Promise<void> => {
  const sessionSecret = resolveOAuthSessionSecret();
  if (!sessionSecret) {
    throw new Error("WeChat OAuth state secret is not configured");
  }
  await setSignedCookie(
    c,
    resolveOAuthStateCookieName(payload.nonce),
    encodeSignedPayload(payload),
    sessionSecret,
    {
      ...resolveCookieBaseOptions(c),
      maxAge: OAUTH_STATE_TTL_SECONDS,
    },
  );
  await setSignedCookie(
    c,
    OAUTH_STATE_COOKIE_NAME,
    encodeSignedPayload(payload),
    sessionSecret,
    {
      ...resolveCookieBaseOptions(c),
      maxAge: OAUTH_STATE_TTL_SECONDS,
    },
  );
};

const buildOAuthStatePayload = (
  returnTo: string,
  mode: OAuthStateMode,
  bindUserId: UserId | null = null,
  anonymousUserId: UserId | null = null,
): OAuthStateCookiePayload => ({
  nonce: randomUUID(),
  returnTo,
  mode,
  bindUserId,
  anonymousUserId,
  expiresAtMs: nowMs() + OAUTH_STATE_TTL_SECONDS * 1000,
});

const requireAuthenticatedUserId = (c: Context): UserId => {
  const auth = c.get("auth");
  if (auth.role === "anonymous" || !auth.userId) {
    throw new Error("Authentication required");
  }

  return auth.userId as UserId;
};

const readSessionUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return null;
  }
  return auth.userId as UserId;
};

type OAuthCallbackAuthPayload = {
  role: "authenticated" | "service";
  userId: UserId;
  userPin: string | null;
  accessToken: string;
};

const issueOAuthCallbackAuth = async (
  c: Context<AuthEnv>,
  user: User,
): Promise<OAuthCallbackAuthPayload> => {
  const ensured = await ensureUserHasPin(user);
  const authenticated = issueAuthForUser(ensured.user);
  c.set("auth", authenticated);

  return {
    role: authenticated.role === "service" ? "service" : "authenticated",
    userId: ensured.user.id,
    userPin: ensured.userPin,
    accessToken: authenticated.token,
  };
};

const resolveAuthenticatedBoundUser = async (
  c: Context,
): Promise<
  | { ok: true; user: User }
  | { ok: false; status: 401; payload: { error: string; code: string } }
> => {
  let userId: UserId;
  try {
    userId = requireAuthenticatedUserId(c);
  } catch {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Authenticated user required",
        code: ANCHOR_USER_AUTH_REQUIRED_CODE,
      },
    };
  }

  const user = await userRepo.findById(userId);
  if (!user || user.status !== "ACTIVE") {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Authenticated user required",
        code: ANCHOR_USER_AUTH_REQUIRED_CODE,
      },
    };
  }

  if (!user.openId) {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Current account is not bound to WeChat",
        code: WECHAT_BIND_REQUIRED_CODE,
      },
    };
  }

  return {
    ok: true,
    user,
  };
};

export const wechatRoute = app
  .use("*", authMiddleware)
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
  .post("/phone/resolve", zValidator("json", resolvePhoneSchema), async (c) => {
    if (!isOAuthRuntimeAvailable()) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }
    if (!phoneService.isConfigured() && !isWeChatAbilityMockingEnabled()) {
      return c.json(
        { error: "WeChat phone capability is not configured" },
        503,
      );
    }

    const identity = await resolveAuthenticatedBoundUser(c);
    if (!identity.ok) {
      return c.json(identity.payload, identity.status);
    }

    const { credential } = c.req.valid("json");
    try {
      const phone = await phoneService.resolvePhoneFromCredential(credential);
      return c.json(phone);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to resolve WeChat phone";
      return c.json(
        {
          error: message,
          code: "WECHAT_PHONE_VERIFY_FAILED",
        },
        400,
      );
    }
  })
  .get("/notifications/subscriptions", async (c) => {
    if (!isOAuthRuntimeAvailable()) {
      return c.json(await buildAnonymousSubscriptionsResponse(false));
    }

    const identity = await resolveAuthenticatedBoundUser(c);
    if (!identity.ok) {
      const fallback = await buildAnonymousSubscriptionsResponse(true);
      if (identity.payload.code === ANCHOR_USER_AUTH_REQUIRED_CODE) {
        return c.json(fallback);
      }
      return c.json({
        ...fallback,
        authenticated: true,
      });
    }

    return c.json(
      await buildAuthenticatedSubscriptionsResponse(identity.user.id),
    );
  })
  .post(
    "/notifications/subscriptions",
    zValidator("json", notificationSubscriptionUpdateSchema),
    async (c) => {
      if (!isOAuthRuntimeAvailable()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const identity = await resolveAuthenticatedBoundUser(c);
      if (!identity.ok) {
        return c.json(identity.payload, identity.status);
      }

      const { kind, enabled } = c.req.valid("json");
      const updatedNotificationOpt =
        await userNotificationOptRepo.upsertWechatNotificationSubscription(
          identity.user.id,
          kind,
          enabled,
        );
      if (!updatedNotificationOpt) {
        return c.json(
          { error: "Failed to update notification subscription" },
          500,
        );
      }
      const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        updatedNotificationOpt,
        kind,
      );
      const deletedJobs = await applyNotificationSubscriptionSideEffects(
        identity.user.id,
        kind,
        enabled,
      );
      const fullState = await buildAuthenticatedSubscriptionsResponse(
        identity.user.id,
      );
      const selectedState = fullState.subscriptions[kind];
      return c.json({
        ok: true,
        kind,
        enabled: snapshot.enabled,
        optInAt: snapshot.optInAt ? snapshot.optInAt.toISOString() : null,
        configured: selectedState.configured,
        deletedJobs,
      });
    },
  )
  .get("/reminders/subscription", async (c) => {
    if (!isOAuthRuntimeAvailable()) {
      const fallback = await buildAnonymousSubscriptionsResponse(false);
      const reminder = fallback.subscriptions.REMINDER_CONFIRMATION;
      return c.json({
        configured: fallback.configured && reminder.configured,
        authenticated: fallback.authenticated,
        wechatBound: fallback.wechatBound,
        enabled: reminder.enabled,
        optInAt: reminder.optInAt,
      });
    }

    const identity = await resolveAuthenticatedBoundUser(c);
    if (!identity.ok) {
      const fallback = await buildAnonymousSubscriptionsResponse(true);
      const reminder = fallback.subscriptions.REMINDER_CONFIRMATION;
      const authenticated =
        identity.payload.code === ANCHOR_USER_AUTH_REQUIRED_CODE ? false : true;
      return c.json({
        configured: fallback.configured && reminder.configured,
        authenticated,
        wechatBound: false,
        enabled: reminder.enabled,
        optInAt: reminder.optInAt,
      });
    }

    const fullState = await buildAuthenticatedSubscriptionsResponse(
      identity.user.id,
    );
    const reminder = fullState.subscriptions.REMINDER_CONFIRMATION;

    return c.json({
      configured: fullState.configured && reminder.configured,
      authenticated: fullState.authenticated,
      wechatBound: fullState.wechatBound,
      enabled: reminder.enabled,
      optInAt: reminder.optInAt,
    });
  })
  .post(
    "/reminders/subscription",
    zValidator("json", reminderSubscriptionUpdateSchema),
    async (c) => {
      if (!isOAuthRuntimeAvailable()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const identity = await resolveAuthenticatedBoundUser(c);
      if (!identity.ok) {
        return c.json(identity.payload, identity.status);
      }

      const { enabled } = c.req.valid("json");
      const updatedNotificationOpt =
        await userNotificationOptRepo.upsertWechatNotificationSubscription(
          identity.user.id,
          "REMINDER_CONFIRMATION",
          enabled,
        );
      if (!updatedNotificationOpt) {
        return c.json({ error: "Failed to update reminder subscription" }, 500);
      }
      const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
        updatedNotificationOpt,
        "REMINDER_CONFIRMATION",
      );
      const deletedJobs = await applyNotificationSubscriptionSideEffects(
        identity.user.id,
        "REMINDER_CONFIRMATION",
        enabled,
      );
      const fullState = await buildAuthenticatedSubscriptionsResponse(
        identity.user.id,
      );
      const reminder = fullState.subscriptions.REMINDER_CONFIRMATION;

      return c.json({
        ok: true,
        enabled: snapshot.enabled,
        optInAt: snapshot.optInAt ? snapshot.optInAt.toISOString() : null,
        configured: fullState.configured && reminder.configured,
        deletedJobs,
      });
    },
  )
  .get(
    "/oauth/mock/authorize",
    zValidator("query", oauthMockAuthorizeQuerySchema),
    async (c) => {
      if (!isWeChatAbilityMockingEnabled()) {
        return c.json({ error: "Mock OAuth is not enabled" }, 404);
      }

      if (!resolveWeChatAbilityMockOpenId()) {
        return c.json({ error: "Mock WeChat openid is not configured" }, 503);
      }

      const { state } = c.req.valid("query");
      return c.redirect(resolveMockOAuthCallbackUrl(c, state), 302);
    },
  )
  .get(
    "/oauth/login",
    zValidator("query", oauthLoginQuerySchema),
    async (c) => {
      const { returnTo: rawReturnTo } = c.req.valid("query");

      let returnTo: string;
      try {
        returnTo = resolveReturnTo(rawReturnTo, c);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid returnTo";
        return c.json({ error: message }, 400);
      }

      const sessionUserId = readSessionUserId(c);
      const auth = c.get("auth");
      const bindUserId =
        auth.role === "anonymous" || !sessionUserId ? null : sessionUserId;
      const anonymousUserId =
        auth.role === "anonymous"
          ? sessionUserId ?? (await readAnonymousSessionCookie(c))
          : null;

      if (isWeChatAbilityMockingEnabled()) {
        const mockOpenId = resolveWeChatAbilityMockOpenId();
        if (!mockOpenId) {
          return c.json({ error: "Mock WeChat openid is not configured" }, 503);
        }

        const statePayload = buildOAuthStatePayload(
          returnTo,
          "login",
          bindUserId,
          anonymousUserId,
        );
        await setOAuthStateCookie(c, statePayload);
        const mockAuthorizeUrl = resolveMockOAuthAuthorizeUrl(
          c,
          statePayload.nonce,
        );
        return c.redirect(mockAuthorizeUrl, 302);
      }

      if (!oauthService.isConfigured()) {
        return c.json({ error: "WeChat OAuth is not configured" }, 503);
      }

      const statePayload = buildOAuthStatePayload(
        returnTo,
        "login",
        bindUserId,
        anonymousUserId,
      );
      await setOAuthStateCookie(c, statePayload);

      const callbackUrl = resolveOAuthCallbackUrl(c);
      const authorizeUrl = oauthService.createAuthorizeUrl(
        callbackUrl,
        statePayload.nonce,
      );

      return c.redirect(authorizeUrl, 302);
    },
  )
  .get("/oauth/bind", zValidator("query", oauthLoginQuerySchema), async (c) => {
    if (!isOAuthRuntimeAvailable()) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }

    let returnTo: string;
    try {
      returnTo = resolveReturnTo(c.req.valid("query").returnTo, c);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid returnTo";
      return c.json({ error: message }, 400);
    }

    let currentUserId: UserId;
    try {
      currentUserId = requireAuthenticatedUserId(c);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication required";
      return c.json({ error: message }, 401);
    }

    const currentUser = await userRepo.findById(currentUserId);
    if (!currentUser) {
      return c.json({ error: "Authenticated user not found" }, 404);
    }
    if (currentUser.openId) {
      return c.json({ error: "Current user is already bound to WeChat" }, 409);
    }

    const statePayload = buildOAuthStatePayload(
      returnTo,
      "bind",
      currentUserId,
    );
    await setOAuthStateCookie(c, statePayload);

    const authorizeUrl = isWeChatAbilityMockingEnabled()
      ? resolveMockOAuthAuthorizeUrl(c, statePayload.nonce)
      : oauthService.isConfigured()
        ? oauthService.createAuthorizeUrl(
            resolveOAuthCallbackUrl(c),
            statePayload.nonce,
          )
        : null;
    if (!authorizeUrl) {
      return c.json({ error: "WeChat OAuth is not configured" }, 503);
    }

    return c.json({ authorizeUrl });
  })
  .get(
    "/oauth/callback",
    zValidator("query", oauthCallbackQuerySchema),
    async (c) => {
      const respondError = (
        status: ContentfulStatusCode,
        error: string,
        returnTo?: string | null,
      ) =>
        c.json({ ok: false, error, returnTo: returnTo ?? undefined }, status);
      const respondSuccess = (
        returnTo: string,
        auth?: OAuthCallbackAuthPayload,
      ) => c.json({ ok: true, returnTo, auth });
      const resolveActiveUserById = async (userId: UserId): Promise<User> => {
        const user = await userRepo.findById(userId);
        if (!user || user.status !== "ACTIVE") {
          throw new Error("Authenticated user not found");
        }
        return user;
      };

      const { code, state } = c.req.valid("query");
      if (!code || !state) {
        clearOAuthStateCookie(c);
        return respondError(400, "Missing code or state");
      }

      const useMockOAuthFlow =
        isWeChatAbilityMockingEnabled() && code === OAUTH_MOCK_CODE;
      if (!useMockOAuthFlow && !oauthService.isConfigured()) {
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        return respondError(503, "WeChat OAuth is not configured");
      }

      const sessionSecret = resolveOAuthSessionSecret();
      if (!sessionSecret) {
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        return respondError(503, "WeChat OAuth is not configured");
      }
      const statePayload =
        (await readSignedCookiePayload(
          c,
          resolveOAuthStateCookieName(state),
          sessionSecret,
          oauthStateCookiePayloadSchema,
        )) ??
        (await readSignedCookiePayload(
          c,
          OAUTH_STATE_COOKIE_NAME,
          sessionSecret,
          oauthStateCookiePayloadSchema,
        ));

      if (!statePayload) {
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        return respondError(400, "Invalid OAuth state");
      }

      if (statePayload.expiresAtMs <= nowMs()) {
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        return respondError(400, "OAuth state expired");
      }

      if (statePayload.nonce !== state) {
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        return respondError(400, "OAuth state mismatch");
      }

      try {
        if (statePayload.mode === "bind" && statePayload.bindUserId) {
          const bindOpenId = useMockOAuthFlow
            ? resolveWeChatAbilityMockOpenId()
            : (await oauthService.exchangeCodeForSession(code)).openId;
          if (!bindOpenId) {
            throw new Error("Mock WeChat openid is not configured");
          }

          const occupiedUser = await userRepo.findByOpenId(bindOpenId);
          if (occupiedUser && occupiedUser.status === "ACTIVE") {
            const authPayload = await issueOAuthCallbackAuth(c, occupiedUser);
            clearAnonymousSessionCookie(c);
            clearOAuthStateCookieByNonce(c, state);
            clearOAuthStateCookie(c);

            return respondSuccess(
              appendBindResultToReturnTo(statePayload.returnTo, "success"),
              authPayload,
            );
          }

          const bindTargetUser = await resolveActiveUserById(
            statePayload.bindUserId as UserId,
          );
          let boundUser: User;

          if (bindTargetUser.role === "anonymous") {
            const upgraded = await upgradeAnonymousUserWithWeChat({
              userId: bindTargetUser.id,
              openId: bindOpenId,
              profile: null,
            });
            if (!upgraded) {
              throw new Error("Failed to upgrade anonymous user");
            }
            boundUser = await resolveActiveUserById(upgraded.userId);
          } else {
            await bindWeChatToCurrentUser(bindTargetUser.id, bindOpenId);
            boundUser = await resolveActiveUserById(bindTargetUser.id);
          }

          const authPayload = await issueOAuthCallbackAuth(c, boundUser);
          clearAnonymousSessionCookie(c);
          clearOAuthStateCookieByNonce(c, state);
          clearOAuthStateCookie(c);

          return respondSuccess(
            appendBindResultToReturnTo(statePayload.returnTo, "success"),
            authPayload,
          );
        }

        let loginOpenId: string | null = null;
        let profile: WeChatOAuthUserProfile | null = null;

        if (useMockOAuthFlow) {
          loginOpenId = resolveWeChatAbilityMockOpenId();
        } else {
          const session = await oauthService.exchangeCodeForSession(code);
          loginOpenId = session.openId;
          profile = await oauthService.fetchUserInfo(
            session.oauthAccessToken,
            session.openId,
            session.scope,
          );
        }

        if (!loginOpenId) {
          throw new Error("Mock WeChat openid is not configured");
        }

        const existingUser = await userRepo.findByOpenId(loginOpenId);
        if (existingUser) {
          const authPayload = await issueOAuthCallbackAuth(c, existingUser);
          clearAnonymousSessionCookie(c);
          clearOAuthStateCookieByNonce(c, state);
          clearOAuthStateCookie(c);
          return respondSuccess(statePayload.returnTo, authPayload);
        }

        const bindCandidateUserId =
          (statePayload.bindUserId as UserId | null) ??
          (statePayload.anonymousUserId as UserId | null) ??
          readSessionUserId(c);
        if (bindCandidateUserId) {
          const bindCandidateUser = await userRepo.findById(bindCandidateUserId);
          if (
            bindCandidateUser &&
            bindCandidateUser.status === "ACTIVE" &&
            !bindCandidateUser.openId
          ) {
            let boundCandidate: User | null = null;
            if (bindCandidateUser.role === "anonymous") {
              const upgraded = await upgradeAnonymousUserWithWeChat({
                userId: bindCandidateUser.id,
                openId: loginOpenId,
                profile: profile,
              });
              if (upgraded) {
                boundCandidate = await resolveActiveUserById(upgraded.userId);
              }
            } else {
              await bindWeChatToCurrentUser(bindCandidateUser.id, loginOpenId);
              boundCandidate = await userRepo.findById(bindCandidateUser.id);
            }

            if (boundCandidate && boundCandidate.status === "ACTIVE") {
              const authPayload = await issueOAuthCallbackAuth(c, boundCandidate);
              clearAnonymousSessionCookie(c);
              clearOAuthStateCookieByNonce(c, state);
              clearOAuthStateCookie(c);
              return respondSuccess(statePayload.returnTo, authPayload);
            }
          }
        }

        const createdUser = await userRepo.createIfNotExists({
          id: randomUUID() as UserId,
          openId: loginOpenId,
          role: "authenticated",
          status: "ACTIVE",
          nickname: profile?.nickname ?? null,
          sex: profile?.sex ?? null,
          avatar: profile?.avatar ?? null,
        });
        const resolvedUser = createdUser ?? (await userRepo.findByOpenId(loginOpenId));
        if (!resolvedUser || resolvedUser.status !== "ACTIVE") {
          throw new Error("Failed to create user for WeChat OAuth login");
        }

        const authPayload = await issueOAuthCallbackAuth(c, resolvedUser);
        clearAnonymousSessionCookie(c);
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        return respondSuccess(statePayload.returnTo, authPayload);
      } catch (error) {
        clearOAuthStateCookieByNonce(c, state);
        clearOAuthStateCookie(c);
        if (statePayload.mode === "bind") {
          return respondSuccess(
            appendBindResultToReturnTo(statePayload.returnTo, "failed"),
          );
        }

        const message =
          error instanceof Error
            ? error.message
            : "WeChat OAuth callback failed";
        return respondError(500, message, statePayload.returnTo);
      }
    },
  );
