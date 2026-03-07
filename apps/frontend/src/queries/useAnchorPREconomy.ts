import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

export type AnchorPREconomyResponse = InferResponseType<
  (typeof client.api.apr)[":id"]["economy"]["$get"]
>;

export const useAnchorPREconomy = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => ["partner-request", "economy", id.value]);

  return useQuery<AnchorPREconomyResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.apr[":id"].economy.$get(
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
