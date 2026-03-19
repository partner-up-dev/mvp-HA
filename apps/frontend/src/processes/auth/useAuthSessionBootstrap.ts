import { onMounted } from "vue";
import { client } from "@/lib/rpc";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import { getStoredAccessToken } from "@/shared/auth/session-storage";

let hasBootstrappedAuthSession = false;
let bootstrappingPromise: Promise<void> | null = null;

const runAuthSessionBootstrap = async (): Promise<void> => {
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
    return;
  }

  const payload = (await res.json()) as AuthSessionPayload;
  store.applyAuthSession(payload);
};

export const ensureAuthSessionBootstrapped = async (): Promise<void> => {
  if (hasBootstrappedAuthSession) {
    return;
  }

  if (!bootstrappingPromise) {
    bootstrappingPromise = runAuthSessionBootstrap().finally(() => {
      hasBootstrappedAuthSession = true;
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
