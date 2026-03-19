/**
 * RPC Client Configuration
 *
 * We do not use traditional axios or fetch with manual wrapping.
 * Must create a type-safe client via the backend's exported AppType.
 */
import { hc } from "hono/client";
import type { AppType } from "@partner-up-dev/backend";
import { getStoredAccessToken, setStoredAccessToken } from "@/shared/auth/session-storage";

export const API_URL = import.meta.env.VITE_API_URL || "";

const ACCESS_TOKEN_HEADER = "x-access-token";

const authFetch: typeof fetch = async (input, init) => {
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

  return response;
};

export const client = hc<AppType>(API_URL, {
  fetch: authFetch,
});
