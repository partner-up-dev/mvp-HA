import { onMounted } from "vue";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { API_URL, client } from "@/lib/rpc";

type WeChatOAuthSessionResponse = {
  configured: boolean;
  authenticated: boolean;
  user: {
    provider: "wechat";
    openId: string;
    unionId: string | null;
  } | null;
};

const WECHAT_LOGIN_ATTEMPT_KEY = "pu_wechat_login_attempted_at";
const WECHAT_LOGIN_COOLDOWN_MS = 30_000;

const getLoginEndpoint = (): string => {
  const path = "/api/wechat/oauth/login";
  if (!API_URL) return path;
  return `${API_URL.replace(/\/+$/, "")}${path}`;
};

const getCurrentReturnTo = (): string => {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete("code");
  currentUrl.searchParams.delete("state");
  return currentUrl.toString();
};

const shouldThrottleLoginAttempt = (): boolean => {
  try {
    const rawValue = localStorage.getItem(WECHAT_LOGIN_ATTEMPT_KEY);
    if (!rawValue) return false;

    const timestamp = Number.parseInt(rawValue, 10);
    if (Number.isNaN(timestamp)) return false;

    return Date.now() - timestamp < WECHAT_LOGIN_COOLDOWN_MS;
  } catch {
    return false;
  }
};

const markLoginAttempt = (): void => {
  try {
    localStorage.setItem(WECHAT_LOGIN_ATTEMPT_KEY, String(Date.now()));
  } catch {
    // Ignore storage write failures in private mode or disabled storage.
  }
};

const fetchSession = async (): Promise<WeChatOAuthSessionResponse | null> => {
  try {
    const res = await client.api.wechat.oauth.session.$get();
    if (!res.ok) return null;
    return (await res.json()) as WeChatOAuthSessionResponse;
  } catch {
    return null;
  }
};

const redirectToLogin = (): void => {
  const loginUrl = new URL(getLoginEndpoint(), window.location.origin);
  loginUrl.searchParams.set("returnTo", getCurrentReturnTo());
  window.location.replace(loginUrl.toString());
};

export const useWeChatAutoLogin = (): void => {
  onMounted(() => {
    void (async () => {
      if (!isWeChatBrowser()) return;

      const session = await fetchSession();
      if (!session || !session.configured || session.authenticated) {
        return;
      }

      if (shouldThrottleLoginAttempt()) {
        return;
      }

      markLoginAttempt();
      redirectToLogin();
    })();
  });
};
