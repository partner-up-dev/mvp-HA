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
  window.location.replace(resolveOAuthLoginUrl(returnTo));
};

export const redirectToWeChatOAuthBind = async (
  returnTo: string,
): Promise<void> => {
  if (typeof window === "undefined") return;

  const res = await client.api.wechat.oauth.bind.$get(
    {
      query: { returnTo },
    },
    {
      init: {
        credentials: "include",
      },
    },
  );

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
