import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";

export type PublishPRResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["publish"]["$post"]
>;

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export const usePublishPR = () => {
  const queryClient = useQueryClient();

  return useMutation<PublishPRResponse, Error, { id: PRId }>({
    mutationFn: async ({ id }) => {
      const res = await client.api.pr[":id"].publish.$post({
        param: { id: id.toString() },
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            i18n.global.t("errors.publishRequestFailed"),
          ),
        );
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
