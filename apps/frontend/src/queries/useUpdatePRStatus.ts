import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { PRId, PRStatusManual } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

interface UpdateStatusInput {
  id: PRId;
  status: PRStatusManual;
  pin: string;
}

export const useUpdatePRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, pin }: UpdateStatusInput) => {
      const res = await client.api.pr[":id"].status.$patch({
        param: { id: id.toString() },
        json: { status, pin },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.updateStatusFailed"),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};
