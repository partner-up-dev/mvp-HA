import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  getStoredAdminAccessToken,
  getStoredAdminSessionRole,
  getStoredAdminUserId,
  setStoredAdminAccessToken,
  setStoredAdminSessionRole,
  setStoredAdminUserId,
  type AdminSessionRole,
} from "@/domains/admin/model/admin-session-storage";
import type { SessionRole } from "@/shared/auth/session-storage";

export type AdminAuthSessionPayload = {
  role: SessionRole;
  userId: string | null;
  accessToken: string;
};

const normalizeRole = (role: SessionRole): AdminSessionRole =>
  role === "service" ? "service" : "anonymous";

export const useAdminSessionStore = defineStore("adminSession", () => {
  const role = ref<AdminSessionRole>(getStoredAdminSessionRole());
  const userId = ref<string | null>(getStoredAdminUserId());
  const accessToken = ref<string | null>(getStoredAdminAccessToken());

  const hasAdminAccess = computed(
    () =>
      role.value === "service" &&
      Boolean(userId.value) &&
      Boolean(accessToken.value),
  );

  const syncStorage = () => {
    setStoredAdminSessionRole(role.value);
    setStoredAdminUserId(userId.value);
    setStoredAdminAccessToken(accessToken.value);
  };

  const applyAuthSession = (payload: AdminAuthSessionPayload) => {
    const nextRole = normalizeRole(payload.role);

    role.value = nextRole;
    userId.value = nextRole === "service" ? payload.userId : null;
    accessToken.value = payload.accessToken;
    syncStorage();
  };

  const clearSession = () => {
    role.value = "anonymous";
    userId.value = null;
    accessToken.value = null;
    syncStorage();
  };

  const setAccessToken = (token: string | null) => {
    accessToken.value = token;
    setStoredAdminAccessToken(token);
  };

  return {
    role,
    userId,
    accessToken,
    hasAdminAccess,
    applyAuthSession,
    clearSession,
    setAccessToken,
  };
});
