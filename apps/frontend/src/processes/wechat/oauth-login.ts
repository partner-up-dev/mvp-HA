import { client } from "@/lib/rpc";

export const resolveOAuthLoginUrl = (returnTo: string): string => {
  try {
    return client.api.wechat.oauth.login
      .$url({
        query: { returnTo },
      })
      .toString();
  } catch {
    const query = new URLSearchParams({ returnTo });
    return `/api/wechat/oauth/login?${query.toString()}`;
  }
};

export const redirectToWeChatOAuthLogin = (returnTo: string): void => {
  if (typeof window === "undefined") return;
  window.location.assign(resolveOAuthLoginUrl(returnTo));
};
