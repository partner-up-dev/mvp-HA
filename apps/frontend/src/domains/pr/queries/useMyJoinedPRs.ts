import { useQuery } from "@tanstack/vue-query";
import type { PartnerRequestSummary } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";

export const useMyJoinedPRs = () => {
  const userSessionStore = useUserSessionStore();

  return useQuery<PartnerRequestSummary[]>({
    queryKey: queryKeys.pr.mineJoined(),
    queryFn: async () => {
      const res = await client.api.pr.mine.joined.$get();
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.fetchMyJoinedRequestsFailed"),
        );
      }

      return await res.json();
    },
    enabled: () => userSessionStore.isAuthenticated,
  });
};
