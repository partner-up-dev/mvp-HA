import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/oauth-login";
import { hasPendingWeChatOAuthHandoff } from "@/processes/wechat/oauth-handoff";

const AUTO_LOGIN_ATTEMPT_STORAGE_KEY =
  "partner_up_wechat_auto_login_attempted_routes";

const readAttemptedRouteKeys = (): string[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(AUTO_LOGIN_ATTEMPT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
};

const writeAttemptedRouteKeys = (keys: string[]): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      AUTO_LOGIN_ATTEMPT_STORAGE_KEY,
      JSON.stringify(keys),
    );
  } catch {
    // Ignore sessionStorage write failures.
  }
};

const hasRouteAttempted = (routeKey: string): boolean =>
  readAttemptedRouteKeys().includes(routeKey);

const markRouteAttempted = (routeKey: string): void => {
  const keys = readAttemptedRouteKeys();
  if (keys.includes(routeKey)) return;
  writeAttemptedRouteKeys([...keys, routeKey]);
};

const clearRouteAttempted = (routeKey: string): void => {
  const keys = readAttemptedRouteKeys();
  if (!keys.includes(routeKey)) return;
  writeAttemptedRouteKeys(keys.filter((entry) => entry !== routeKey));
};

const resolveAutoLoginRouteKey = (
  routePath: string,
  wechatAutoLoginPolicy: "route" | "skip" | undefined,
): string | null => {
  if (wechatAutoLoginPolicy !== "route") return null;
  return routePath;
};

export const useRouteWeChatAutoLogin = () => {
  const route = useRoute();
  const userSessionStore = useUserSessionStore();
  const redirecting = ref(false);

  const attemptAutoLogin = () => {
    if (typeof window === "undefined") return;
    if (redirecting.value) return;

    const routeKey = resolveAutoLoginRouteKey(
      route.path,
      route.meta.wechatAutoLoginPolicy,
    );
    if (!routeKey) return;
    if (hasPendingWeChatOAuthHandoff()) return;

    if (userSessionStore.isAuthenticated) {
      clearRouteAttempted(routeKey);
      return;
    }

    if (!isWeChatAbilityEnv()) return;
    if (hasRouteAttempted(routeKey)) return;

    markRouteAttempted(routeKey);
    redirecting.value = true;
    redirectToWeChatOAuthLogin(window.location.href);
  };

  watch(
    () =>
      [route.name, route.path, userSessionStore.role, userSessionStore.userId] as const,
    () => {
      attemptAutoLogin();
    },
    { immediate: true },
  );

  return {
    attemptAutoLogin,
  };
};
