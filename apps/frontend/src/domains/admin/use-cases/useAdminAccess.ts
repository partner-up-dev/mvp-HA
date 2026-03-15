import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";

export const useAdminAccess = () => {
  const router = useRouter();
  const userSessionStore = useUserSessionStore();
  const { hasAdminAccess } = storeToRefs(userSessionStore);

  const logout = async () => {
    userSessionStore.clearSession();
    await router.replace({ name: "admin-login" });
  };

  return {
    isAdmin: hasAdminAccess,
    logout,
  };
};
