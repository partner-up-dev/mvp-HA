import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { SessionRole } from "@/shared/auth/session-storage";
import {
  getStoredAccessToken,
  getStoredSessionRole,
  getStoredUserId,
  getStoredUserPin,
  setStoredAccessToken,
  setStoredSessionRole,
  setStoredUserId,
  setStoredUserPin,
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
    () => role.value === "authenticated" && Boolean(userId.value),
  );

  const syncStorage = () => {
    setStoredSessionRole(role.value);
    setStoredUserId(userId.value);
    setStoredUserPin(userPin.value);
    setStoredAccessToken(accessToken.value);
  };

  const applyAuthSession = (payload: AuthSessionPayload) => {
    role.value = payload.role;
    userId.value = payload.userId;

    if (payload.userPin !== null) {
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

  const setUserCredentials = (nextUserId: string, nextUserPin: string | null) => {
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
    applyAuthSession,
    setAccessToken,
    setRole,
    clearSession,
    setUserCredentials,
  };
});
