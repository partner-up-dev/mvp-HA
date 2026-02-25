import { useQuery } from '@tanstack/vue-query';
import { client } from '@/lib/rpc';
import type { Ref } from 'vue';
import type { PRId } from '@partner-up-dev/backend';
import { i18n } from "@/locales/i18n";

export const usePR = (id: Ref<PRId | null>) => {
  return useQuery({
    queryKey: ['partner-request', id],
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.pr[':id'].$get({
        param: { id: prId.toString() },
      }, {
        init: {
          credentials: "include",
        },
      });

      if (!res.ok) {
        throw new Error(i18n.global.t("errors.fetchRequestFailed"));
      }

      return await res.json();
    },
    enabled: () => id.value !== null,
  });
};
