import { onMounted } from "vue";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { client } from "@/lib/rpc";

const OAUTH_SESSION_TIMEOUT_MS = 8000;

let hasAttemptedAutoWeChatLogin = false;

export type WeChatOAuthSession = {
  configured: boolean;
  authenticated: boolean;
  openId: string | null;
};

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

export const fetchOAuthSession = async (): Promise<WeChatOAuthSession | null> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    OAUTH_SESSION_TIMEOUT_MS,
  );

  try {
    const res = await client.api.wechat.oauth.session.$get(undefined, {
      init: {
        credentials: "include",
        signal: controller.signal,
      },
    });

    if (!res.ok) return null;
    return (await res.json()) as WeChatOAuthSession;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const redirectToWeChatOAuthLogin = (returnTo: string): void => {
  if (typeof window === "undefined") return;
  window.location.assign(resolveOAuthLoginUrl(returnTo));
};

const attemptAutoWeChatLogin = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  if (!isWeChatBrowser()) return;
  if (hasAttemptedAutoWeChatLogin) return;
  hasAttemptedAutoWeChatLogin = true;

  const session = await fetchOAuthSession();
  if (!session) return;
  if (!session.configured || session.authenticated) return;

  redirectToWeChatOAuthLogin(window.location.href);
};

export const useAutoWeChatLogin = (): void => {
  onMounted(() => {
    void attemptAutoWeChatLogin();
  });
};
