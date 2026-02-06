import { useQuery } from '@tanstack/vue-query';
import { computed, watch } from 'vue';
import { client } from '@/lib/rpc';
import { useUserPRStore } from '@/stores/userPRStore';
import type { PartnerRequestSummary, PRId } from '@partner-up-dev/backend';
import { i18n } from "@/locales/i18n";

export const useCreatorPRs = () => {
  const userPRStore = useUserPRStore();

  const creatorIds = computed(() => userPRStore.createdPRs);

  const query = useQuery({
    queryKey: ['partner-request', 'creator', creatorIds],
    queryFn: async () => {
      const idsSnapshot = [...creatorIds.value];

      const res = await client.api.pr.batch.$post({
        json: { ids: idsSnapshot },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.fetchCreatedRequestsFailed"),
        );
      }

      const items = (await res.json()) as PartnerRequestSummary[];
      return { requestedIds: idsSnapshot as PRId[], items };
    },
    enabled: () => creatorIds.value.length > 0,
  });

  watch(
    () => query.data.value,
    (payload) => {
      if (!payload) return;

      const foundIds = new Set(payload.items.map((item) => item.id));
      for (const id of payload.requestedIds) {
        if (!foundIds.has(id)) {
          userPRStore.removeCreatedPR(id);
        }
      }
    },
  );

  return query;
};
