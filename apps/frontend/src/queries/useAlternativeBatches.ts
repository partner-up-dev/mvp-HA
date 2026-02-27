import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

export type AlternativeBatchesResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["alternative-batches"]["$get"]
>;

export const useAlternativeBatches = (
  id: Ref<PRId | null>,
  enabled: Ref<boolean>,
) => {
  const queryKey = computed(() => ["pr", "alternative-batches", id.value]);

  return useQuery<AlternativeBatchesResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error("缺少搭子请求 ID");
      }

      const res = await client.api.pr[":id"]["alternative-batches"].$get({
        param: { id: prId.toString() },
      });

      if (!res.ok) {
        throw new Error("获取其它时段推荐失败");
      }

      return await res.json();
    },
    enabled: () => enabled.value && id.value !== null,
  });
};
