import { hc } from "hono/client";
import type { AppType } from "@partner-up-dev/backend";
import {
  clearStoredSession,
  getStoredAccessToken,
  setStoredAccessToken,
} from "@/shared/auth/session-storage";
import { API_URL } from "@/lib/rpc";

const ACCESS_TOKEN_HEADER = "x-access-token";

const redirectToAdminLogin = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const currentPath =
    window.location.pathname + window.location.search + window.location.hash;
  const target = `/admin/login?redirect=${encodeURIComponent(currentPath)}`;

  if (window.location.pathname === "/admin/login") {
    return;
  }

  window.location.replace(target);
};

const adminFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  const token = getStoredAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  const rotatedToken = response.headers.get(ACCESS_TOKEN_HEADER);
  if (rotatedToken) {
    setStoredAccessToken(rotatedToken);
  }

  if (response.status === 401) {
    clearStoredSession();
    redirectToAdminLogin();
  }

  return response;
};

export const adminClient = hc<AppType>(API_URL, {
  fetch: adminFetch,
});
