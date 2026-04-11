import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import type { AnchorPRSearchView } from "@/domains/pr/model/types";
import { queryKeys } from "@/shared/api/query-keys";
import {
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";

type AnchorPRSearchCriteria = {
  eventId: number;
  dates: string[];
};

export const useAnchorPRSearch = (
  criteria: Ref<AnchorPRSearchCriteria | null>,
  enabled: Ref<boolean>,
) => {
  const queryKey = computed(() => {
    const currentCriteria = criteria.value;
    return queryKeys.anchorPR.search(
      currentCriteria?.eventId ?? null,
      currentCriteria?.dates ?? [],
    );
  });

  return useQuery<AnchorPRSearchView>({
    queryKey,
    queryFn: async () => {
      const currentCriteria = criteria.value;
      if (!currentCriteria) {
        throw new Error(i18n.global.t("anchorPRSearch.loadFailed"));
      }

      const res = await client.api.apr.search.$get({
        query: {
          eventId: currentCriteria.eventId.toString(),
          date: currentCriteria.dates,
        },
      });

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw new Error(
          resolveApiErrorMessage(
            payload,
            i18n.global.t("anchorPRSearch.loadFailed"),
          ),
        );
      }

      return await res.json();
    },
    enabled: () => enabled.value && criteria.value !== null,
  });
};
