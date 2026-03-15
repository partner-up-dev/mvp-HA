import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  getStoredAccessToken,
  getStoredSessionRole,
  getStoredUserId,
  getStoredUserPin,
  isAuthenticatedSessionRole,
  setStoredAccessToken,
  setStoredSessionRole,
  setStoredUserId,
  setStoredUserPin,
  type SessionRole,
} from "@/shared/auth/session-storage";

export type AuthSessionPayload = {
  role: SessionRole;
  userId: string | null;
  userPin: string | null;
  accessToken: string;
};

export const useUserSessionStore = defineStore("userSession", () => {
  const role = ref<SessionRole>(getStoredSessionRole());
  const userId = ref<string | null>(getStoredUserId());
  const userPin = ref<string | null>(getStoredUserPin());
  const accessToken = ref<string | null>(getStoredAccessToken());

  const isAuthenticated = computed(
    () => isAuthenticatedSessionRole(role.value) && Boolean(userId.value),
  );

  const hasAdminAccess = computed(
    () =>
      role.value === "service" &&
      Boolean(userId.value) &&
      Boolean(accessToken.value),
  );

  const syncStorage = () => {
    setStoredSessionRole(role.value);
    setStoredUserId(userId.value);
    setStoredUserPin(userPin.value);
    setStoredAccessToken(accessToken.value);
  };

  const applyAuthSession = (payload: AuthSessionPayload) => {
    const previousUserId = userId.value;
    const previousRole = role.value;

    role.value = payload.role;
    userId.value = payload.userId;

    const shouldReplaceUserPin =
      payload.userPin !== null ||
      payload.role === "anonymous" ||
      payload.role === "service" ||
      previousUserId !== payload.userId ||
      previousRole !== payload.role;

    if (shouldReplaceUserPin) {
      userPin.value = payload.userPin;
    }

    accessToken.value = payload.accessToken;
    syncStorage();
  };

  const setAccessToken = (token: string | null) => {
    accessToken.value = token;
    setStoredAccessToken(token);
  };

  const setRole = (nextRole: SessionRole) => {
    role.value = nextRole;
    setStoredSessionRole(nextRole);
  };

  const clearSession = () => {
    role.value = "anonymous";
    userId.value = null;
    userPin.value = null;
    accessToken.value = null;
    syncStorage();
  };

  const setUserCredentials = (
    nextUserId: string,
    nextUserPin: string | null,
  ) => {
    userId.value = nextUserId;
    userPin.value = nextUserPin;
    syncStorage();
  };

  return {
    role,
    userId,
    userPin,
    accessToken,
    isAuthenticated,
    hasAdminAccess,
    applyAuthSession,
    setAccessToken,
    setRole,
    clearSession,
    setUserCredentials,
  };
});
