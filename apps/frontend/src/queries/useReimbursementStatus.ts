import { useQuery } from "@tanstack/vue-query";
import type { PRId } from "@partner-up-dev/backend";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

export type ReimbursementStatusResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["reimbursement"]["status"]["$get"]
>;

export const useReimbursementStatus = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.pr.reimbursementStatus(id.value));

  return useQuery<ReimbursementStatusResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.pr[":id"].reimbursement.status.$get(
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
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.fetchReimbursementStatusFailed"),
        );
      }

      return await res.json();
    },
    enabled: () => id.value !== null,
  });
};
