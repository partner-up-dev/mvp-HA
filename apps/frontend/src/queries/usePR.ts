import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

export type PRDetailResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["$get"]
>;

export const usePR = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.pr.detail(id.value));

  return useQuery<PRDetailResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.pr[":id"].$get(
        {
          param: { id: prId.toString() },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        throw new Error(i18n.global.t("errors.fetchRequestFailed"));
      }

      return await res.json();
    },
    enabled: () => id.value !== null,
  });
};
