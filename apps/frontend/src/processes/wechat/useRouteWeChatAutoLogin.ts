import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/oauth-login";

const AUTO_LOGIN_ROUTE_NAMES = new Set([
  "anchor-event",
  "anchor-pr",
  "anchor-pr-booking-support",
  "anchor-partner-profile",
]);
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
  routeName: string | symbol | null | undefined,
  routePath: string,
): string | null => {
  if (typeof routeName !== "string") return null;
  if (!AUTO_LOGIN_ROUTE_NAMES.has(routeName)) return null;
  return routePath;
};

export const useRouteWeChatAutoLogin = () => {
  const route = useRoute();
  const userSessionStore = useUserSessionStore();
  const redirecting = ref(false);

  const attemptAutoLogin = () => {
    if (typeof window === "undefined") return;
    if (redirecting.value) return;

    const routeKey = resolveAutoLoginRouteKey(route.name, route.path);
    if (!routeKey) return;

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
