import { resolveApiUrl } from "@/shared/api/base-url";
import {
  clearWeChatOAuthLoginPending,
  markWeChatOAuthLoginPending,
} from "@/processes/wechat/oauth-login-pending";
import {
  createWeChatOAuthDiagnosticTimer,
  logWeChatOAuthDiagnostic,
  markWeChatOAuthDiagnosticStart,
  toDiagnosticPath,
} from "@/processes/wechat/oauth-diagnostics";

let oauthLoginRedirectInProgress = false;

const scheduleOAuthLoginRedirect = (url: string): void => {
  const redirect = (): void => {
    logWeChatOAuthDiagnostic("login.redirect.execute", {
      targetPath: toDiagnosticPath(url),
    });
    window.location.replace(url);
  };

  logWeChatOAuthDiagnostic("login.redirect.schedule", {
    targetPath: toDiagnosticPath(url),
    hasRequestAnimationFrame:
      typeof window.requestAnimationFrame === "function",
  });

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      window.setTimeout(redirect, 0);
    });
    return;
  }

  window.setTimeout(redirect, 0);
};

export const resolveOAuthLoginUrl = (returnTo: string): string => {
  const query = new URLSearchParams({ returnTo });
  return resolveApiUrl("/api/wechat/oauth/login", query);
};

export const requestWeChatOAuthLogin = (returnTo: string): boolean => {
  if (typeof window === "undefined") return false;
  if (oauthLoginRedirectInProgress) {
    logWeChatOAuthDiagnostic("login.request.skip_redirect_in_progress", {
      returnToPath: toDiagnosticPath(returnTo),
    });
    return true;
  }

  oauthLoginRedirectInProgress = true;
  markWeChatOAuthDiagnosticStart({
    entry: "login",
    returnToPath: toDiagnosticPath(returnTo),
  });
  markWeChatOAuthLoginPending();
  scheduleOAuthLoginRedirect(resolveOAuthLoginUrl(returnTo));
  return true;
};

export const redirectToWeChatOAuthLogin = (returnTo: string): void => {
  requestWeChatOAuthLogin(returnTo);
};

export const resetWeChatOAuthLoginRedirectStateForTest = (): void => {
  oauthLoginRedirectInProgress = false;
  clearWeChatOAuthLoginPending();
};

export const redirectToWeChatOAuthBind = async (
  returnTo: string,
): Promise<void> => {
  if (typeof window === "undefined") return;

  markWeChatOAuthDiagnosticStart({
    entry: "bind",
    returnToPath: toDiagnosticPath(returnTo),
  });

  const query = new URLSearchParams({ returnTo });
  const stopBindFetchTimer = createWeChatOAuthDiagnosticTimer();
  logWeChatOAuthDiagnostic("bind.authorize_url.request.start");
  const res = await fetch(resolveApiUrl("/api/wechat/oauth/bind", query), {
    credentials: "include",
  });
  logWeChatOAuthDiagnostic("bind.authorize_url.request.end", {
    status: res.status,
    ok: res.ok,
    durationMs: stopBindFetchTimer(),
  });

  if (!res.ok) {
    // Fallback to login flow if bind endpoint is temporarily unavailable.
    logWeChatOAuthDiagnostic("bind.fallback_login", {
      reason: "bind_endpoint_not_ok",
      status: res.status,
    });
    requestWeChatOAuthLogin(returnTo);
    return;
  }

  const payload = (await res.json()) as { authorizeUrl?: string };
  if (!payload.authorizeUrl) {
    logWeChatOAuthDiagnostic("bind.fallback_login", {
      reason: "missing_authorize_url",
    });
    requestWeChatOAuthLogin(returnTo);
    return;
  }

  logWeChatOAuthDiagnostic("bind.redirect.execute", {
    targetPath: toDiagnosticPath(payload.authorizeUrl),
  });
  window.location.replace(payload.authorizeUrl);
};
