import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

type JoinInput = {
  id: PRId;
};

export const useJoinPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: JoinInput) => {
      const res = await client.api.pr[":id"].join.$post(
        {
          param: { id: id.toString() },
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
          error.error || i18n.global.t("errors.joinRequestFailed"),
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
