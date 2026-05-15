import { onMounted } from "vue";
import { client } from "@/lib/rpc";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import {
  getStoredAccessToken,
  getStoredUserId,
} from "@/shared/auth/session-storage";
import { hasPendingWeChatOAuthHandoff } from "@/processes/wechat/oauth-handoff";
import {
  createWeChatOAuthDiagnosticTimer,
  logWeChatOAuthDiagnostic,
} from "@/processes/wechat/oauth-diagnostics";

let hasBootstrappedAuthSession = false;
let bootstrappingPromise: Promise<void> | null = null;

type AuthSessionBootstrapResult = "completed" | "deferred";

const registerFreshAnonymousSession = async (
  store: ReturnType<typeof useUserSessionStore>,
): Promise<boolean> => {
  const stopRegisterTimer = createWeChatOAuthDiagnosticTimer();
  logWeChatOAuthDiagnostic("auth_bootstrap.register_anonymous.start");
  const registerRes = await client.api.auth.register.anonymous.$post(
    undefined,
    {
      init: {
        credentials: "include",
      },
    },
  );
  logWeChatOAuthDiagnostic("auth_bootstrap.register_anonymous.end", {
    status: registerRes.status,
    ok: registerRes.ok,
    durationMs: stopRegisterTimer(),
  });

  if (!registerRes.ok) {
    return false;
  }

  const payload = (await registerRes.json()) as AuthSessionPayload;
  store.applyAuthSession(payload);
  return true;
};

const runAuthSessionBootstrap = async (): Promise<AuthSessionBootstrapResult> => {
  logWeChatOAuthDiagnostic("auth_bootstrap.run.start");
  if (typeof window !== "undefined") {
    const isOAuthCallback =
      window.location.pathname === "/wechat/oauth/callback";
    if (isOAuthCallback) {
      const searchParams = new URLSearchParams(window.location.search);
      const hasOAuthParams =
        Boolean(searchParams.get("code")) && Boolean(searchParams.get("state"));
      if (hasOAuthParams) {
        logWeChatOAuthDiagnostic("auth_bootstrap.run.skip_callback_page", {
          hasCode: true,
          hasState: true,
        });
        return "completed";
      }
    }
  }

  if (hasPendingWeChatOAuthHandoff()) {
    logWeChatOAuthDiagnostic("auth_bootstrap.run.deferred_handoff");
    return "deferred";
  }

  const store = useUserSessionStore();

  const existingToken = getStoredAccessToken();
  const storedUserId = store.userId ?? getStoredUserId();

  if (!existingToken && !storedUserId) {
    logWeChatOAuthDiagnostic("auth_bootstrap.run.needs_anonymous_register");
    await registerFreshAnonymousSession(store);
  }

  const currentUserId = store.userId ?? storedUserId;

  const stopSessionTimer = createWeChatOAuthDiagnosticTimer();
  logWeChatOAuthDiagnostic("auth_bootstrap.session.request.start", {
    hasCurrentUserId: Boolean(currentUserId),
    hasExistingToken: Boolean(existingToken),
  });
  const res = await client.api.auth.session.$post(
    {
      json: {
        userId: currentUserId,
      },
    },
    {
      init: {
        credentials: "include",
      },
    },
  );
  logWeChatOAuthDiagnostic("auth_bootstrap.session.request.end", {
    status: res.status,
    ok: res.ok,
    durationMs: stopSessionTimer(),
  });

  if (!res.ok) {
    if (res.status === 401) {
      store.clearSession();
    }

    const rotated = getStoredAccessToken();
    store.setAccessToken(rotated);
    logWeChatOAuthDiagnostic("auth_bootstrap.run.completed_after_error", {
      status: res.status,
      hasRotatedToken: Boolean(rotated),
    });
    return "completed";
  }

  const payload = (await res.json()) as AuthSessionPayload;
  store.applyAuthSession(payload);
  logWeChatOAuthDiagnostic("auth_bootstrap.run.completed", {
    role: payload.role,
    hasUserId: Boolean(payload.userId),
  });
  return "completed";
};

export const ensureAuthSessionBootstrapped = async (): Promise<void> => {
  if (hasBootstrappedAuthSession) {
    logWeChatOAuthDiagnostic("auth_bootstrap.ensure.skip_already_completed");
    return;
  }

  if (!bootstrappingPromise) {
    logWeChatOAuthDiagnostic("auth_bootstrap.ensure.create_promise");
    bootstrappingPromise = runAuthSessionBootstrap()
      .then((result) => {
        logWeChatOAuthDiagnostic("auth_bootstrap.ensure.result", {
          result,
        });
        if (result === "completed") {
          hasBootstrappedAuthSession = true;
        }
      })
      .finally(() => {
        logWeChatOAuthDiagnostic("auth_bootstrap.ensure.promise_cleared");
        bootstrappingPromise = null;
      });
  } else {
    logWeChatOAuthDiagnostic("auth_bootstrap.ensure.join_existing_promise");
  }

  await bootstrappingPromise;
};

export const resetAuthSessionToFreshAnonymous = async (): Promise<void> => {
  if (bootstrappingPromise) {
    try {
      await bootstrappingPromise;
    } catch {
      // Continue with an explicit user-initiated session reset.
    }
  }

  const store = useUserSessionStore();
  store.clearSession();
  hasBootstrappedAuthSession = false;
  const registered = await registerFreshAnonymousSession(store);
  if (!registered) {
    throw new Error("Failed to start anonymous session");
  }
  hasBootstrappedAuthSession = true;
};

export const useAuthSessionBootstrap = (): void => {
  onMounted(() => {
    void ensureAuthSessionBootstrapped();
  });
};
