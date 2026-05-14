import { resolveApiUrl } from "@/shared/api/base-url";

export const resolveOAuthLoginUrl = (returnTo: string): string => {
  const query = new URLSearchParams({ returnTo });
  return resolveApiUrl("/api/wechat/oauth/login", query);
};

export const redirectToWeChatOAuthLogin = (returnTo: string): void => {
  if (typeof window === "undefined") return;
  window.location.replace(resolveOAuthLoginUrl(returnTo));
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
    redirectToWeChatOAuthLogin(returnTo);
    return;
  }

  const payload = (await res.json()) as { authorizeUrl?: string };
  if (!payload.authorizeUrl) {
    redirectToWeChatOAuthLogin(returnTo);
    return;
  }

  window.location.replace(payload.authorizeUrl);
};
