import { onMounted } from "vue";
import { client } from "@/lib/rpc";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import { getStoredAccessToken } from "@/shared/auth/session-storage";
import { hasPendingWeChatOAuthHandoff } from "@/processes/wechat/oauth-handoff";

let hasBootstrappedAuthSession = false;
let bootstrappingPromise: Promise<void> | null = null;

type AuthSessionBootstrapResult = "completed" | "deferred";

const runAuthSessionBootstrap = async (): Promise<AuthSessionBootstrapResult> => {
  if (typeof window !== "undefined") {
    const isOAuthCallback =
      window.location.pathname === "/wechat/oauth/callback";
    if (isOAuthCallback) {
      const searchParams = new URLSearchParams(window.location.search);
      const hasOAuthParams =
        Boolean(searchParams.get("code")) && Boolean(searchParams.get("state"));
      if (hasOAuthParams) {
        return "completed";
      }
    }
  }

  if (hasPendingWeChatOAuthHandoff()) {
    return "deferred";
  }

  const store = useUserSessionStore();

  const existingToken = getStoredAccessToken();

  if (!existingToken) {
    const registerRes = await client.api.auth.register.anonymous.$post(
      undefined,
      {
        init: {
          credentials: "include",
        },
      },
    );
    if (registerRes.ok) {
      const payload = (await registerRes.json()) as AuthSessionPayload;
      store.applyAuthSession(payload);
    }
  }

  const currentUserId = store.userId;
  const currentUserPin = store.userPin;

  const res = await client.api.auth.session.$post(
    {
      json: {
        userId: currentUserId,
        userPin: currentUserPin,
      },
    },
    {
      init: {
        credentials: "include",
      },
    },
  );

  if (!res.ok) {
    if (res.status === 401) {
      store.clearSession();
    }

    const rotated = getStoredAccessToken();
    store.setAccessToken(rotated);
    return "completed";
  }

  const payload = (await res.json()) as AuthSessionPayload;
  store.applyAuthSession(payload);
  return "completed";
};

export const ensureAuthSessionBootstrapped = async (): Promise<void> => {
  if (hasBootstrappedAuthSession) {
    return;
  }

  if (!bootstrappingPromise) {
    bootstrappingPromise = runAuthSessionBootstrap()
      .then((result) => {
        if (result === "completed") {
          hasBootstrappedAuthSession = true;
        }
      })
      .finally(() => {
        bootstrappingPromise = null;
      });
  }

  await bootstrappingPromise;
};

export const useAuthSessionBootstrap = (): void => {
  onMounted(() => {
    void ensureAuthSessionBootstrapped();
  });
};
