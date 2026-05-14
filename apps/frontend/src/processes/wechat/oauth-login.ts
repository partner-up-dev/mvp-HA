import { resolveApiUrl } from "@/shared/api/base-url";

let oauthLoginRedirectInProgress = false;

export const resolveOAuthLoginUrl = (returnTo: string): string => {
  const query = new URLSearchParams({ returnTo });
  return resolveApiUrl("/api/wechat/oauth/login", query);
};

export const requestWeChatOAuthLogin = (returnTo: string): boolean => {
  if (typeof window === "undefined") return false;
  if (oauthLoginRedirectInProgress) return true;

  oauthLoginRedirectInProgress = true;
  window.location.replace(resolveOAuthLoginUrl(returnTo));
  return true;
};

export const redirectToWeChatOAuthLogin = (returnTo: string): void => {
  requestWeChatOAuthLogin(returnTo);
};

export const resetWeChatOAuthLoginRedirectStateForTest = (): void => {
  oauthLoginRedirectInProgress = false;
};

export const redirectToWeChatOAuthBind = async (
  returnTo: string,
): Promise<void> => {
  if (typeof window === "undefined") return;

  const query = new URLSearchParams({ returnTo });
  const res = await fetch(resolveApiUrl("/api/wechat/oauth/bind", query), {
    credentials: "include",
  });

  if (!res.ok) {
    // Fallback to login flow if bind endpoint is temporarily unavailable.
    requestWeChatOAuthLogin(returnTo);
    return;
  }

  const payload = (await res.json()) as { authorizeUrl?: string };
  if (!payload.authorizeUrl) {
    requestWeChatOAuthLogin(returnTo);
    return;
  }

  window.location.replace(payload.authorizeUrl);
};
