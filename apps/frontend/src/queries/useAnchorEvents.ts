import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

export type AnchorEventListResponse = InferResponseType<
  (typeof client.api.events)["$get"]
>;

export const useAnchorEvents = () => {
  return useQuery<AnchorEventListResponse>({
    queryKey: queryKeys.anchorEvent.list(),
    queryFn: async () => {
      const res = await client.api.events.$get();
      if (!res.ok) {
        throw new Error("获取活动列表失败");
      }
      return await res.json();
    },
  });
};
