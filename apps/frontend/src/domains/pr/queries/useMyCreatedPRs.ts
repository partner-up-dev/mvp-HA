import { useQuery } from "@tanstack/vue-query";
import type { PartnerRequestSummary } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";
import { useUserSessionStore } from "@/stores/userSessionStore";

export const useMyCreatedPRs = () => {
  const userSessionStore = useUserSessionStore();

  return useQuery<PartnerRequestSummary[]>({
    queryKey: queryKeys.pr.mineCreated(),
    queryFn: async () => {
      const res = await client.api.pr.mine.created.$get();
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.fetchMyCreatedRequestsFailed"),
        );
      }

      return await res.json();
    },
    enabled: () => userSessionStore.isAuthenticated,
  });
};
