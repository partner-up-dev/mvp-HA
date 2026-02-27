import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

type TimeWindow = [string | null, string | null];

export type AcceptAlternativeBatchResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["accept-alternative-batch"]["$post"]
>;

export const useAcceptAlternativeBatch = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AcceptAlternativeBatchResponse,
    Error,
    { id: PRId; targetTimeWindow: TimeWindow }
  >({
    mutationFn: async ({ id, targetTimeWindow }) => {
      const res = await client.api.pr[":id"]["accept-alternative-batch"].$post({
        param: { id: id.toString() },
        json: { targetTimeWindow },
      });

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error || "接受其它时段推荐失败");
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: ["pr", "alternative-batches", variables.id],
      });
    },
  });
};
