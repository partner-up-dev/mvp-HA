import { client } from "@/lib/rpc";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { clearWeChatOAuthLoginPending } from "@/processes/wechat/oauth-login-pending";
import {
  createWeChatOAuthDiagnosticTimer,
  logWeChatOAuthDiagnostic,
} from "@/processes/wechat/oauth-diagnostics";

export const WECHAT_OAUTH_HANDOFF_QUERY_PARAM = "wechatOAuthHandoff";
export const WECHAT_OAUTH_HANDOFF_CLEARED_EVENT =
  "partnerup:wechat-oauth-handoff-cleared";

type ConsumeWeChatOAuthHandoffOptions = {
  signal?: AbortSignal;
};

const resolveCurrentUrl = (): URL | null => {
  if (typeof window === "undefined") return null;

  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
};

export const clearWeChatOAuthHandoffFromAddressBar = (): void => {
  if (typeof window === "undefined") return;

  const url = resolveCurrentUrl();
  if (!url) return;

  const hadHandoff = url.searchParams.has(WECHAT_OAUTH_HANDOFF_QUERY_PARAM);
  url.searchParams.delete(WECHAT_OAUTH_HANDOFF_QUERY_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
  logWeChatOAuthDiagnostic("handoff.url_cleaned", {
    hadHandoff,
  });

  if (hadHandoff) {
    window.dispatchEvent(new Event(WECHAT_OAUTH_HANDOFF_CLEARED_EVENT));
  }
};

export const hasPendingWeChatOAuthHandoff = (): boolean => {
  const url = resolveCurrentUrl();
  if (!url) return false;
  return url.searchParams.has(WECHAT_OAUTH_HANDOFF_QUERY_PARAM);
};

export const consumeWeChatOAuthHandoff = async (
  options: ConsumeWeChatOAuthHandoffOptions = {},
): Promise<boolean> => {
  const url = resolveCurrentUrl();
  const handoff = url?.searchParams.get(WECHAT_OAUTH_HANDOFF_QUERY_PARAM);
  if (!handoff) return false;

  const stopRequestTimer = createWeChatOAuthDiagnosticTimer();
  logWeChatOAuthDiagnostic("handoff.exchange.request.start", {
    hasHandoff: true,
  });
  const res = await client.api.wechat.oauth.handoff.$get(
    {
      query: { handoff },
    },
    {
      init: {
        credentials: "include",
        signal: options.signal,
      },
    },
  );
  logWeChatOAuthDiagnostic("handoff.exchange.request.end", {
    status: res.status,
    ok: res.ok,
    durationMs: stopRequestTimer(),
  });

  if (!res.ok) {
    return false;
  }

  const payload = await res.json();
  logWeChatOAuthDiagnostic("handoff.exchange.payload", {
    ok: payload.ok,
    hasAuth: Boolean(payload.ok ? payload.auth : null),
  });
  if (!payload.ok) {
    return false;
  }

  const userSessionStore = useUserSessionStore();
  userSessionStore.applyAuthSession(payload.auth);
  logWeChatOAuthDiagnostic("handoff.auth_applied", {
    role: payload.auth.role,
    hasUserId: Boolean(payload.auth.userId),
  });
  clearWeChatOAuthHandoffFromAddressBar();
  clearWeChatOAuthLoginPending();
  return true;
};
