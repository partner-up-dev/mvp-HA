import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

export type AnchorEventDetailResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["$get"]
>;

export const useAnchorEventDetail = (eventId: Ref<number | null>) => {
  const queryKey = computed(() => queryKeys.anchorEvent.detail(eventId.value));

  return useQuery<AnchorEventDetailResponse>({
    queryKey,
    queryFn: async () => {
      const id = eventId.value;
      if (id === null) {
        throw new Error("缺少活动 ID");
      }
      const res = await client.api.events[":eventId"].$get({
        param: { eventId: id.toString() },
      });
      if (!res.ok) {
        throw new Error("获取活动详情失败");
      }
      return await res.json();
    },
    enabled: () => eventId.value !== null,
  });
};
