import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

type PublishPRResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["publish"]["$post"]
>;

export const usePublishPR = () => {
  const queryClient = useQueryClient();

  return useMutation<PublishPRResponse, Error, { id: PRId }>({
    mutationFn: async ({ id }) => {
      const res = await client.api.pr[":id"].publish.$post({
        param: { id: id.toString() },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || i18n.global.t("errors.publishRequestFailed"));
      }

      return await res.json();
    },
    onSuccess: (_payload, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineCreated(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};
