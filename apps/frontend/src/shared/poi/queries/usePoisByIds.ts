import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

export type PoisByIdsResponse = InferResponseType<
  (typeof client.api.pois)["by-ids"]["$get"]
>;

export const usePoisByIds = (idsCsv: Ref<string | null>) => {
  const normalizedIdsCsv = computed(() => {
    const rawValue = idsCsv.value;
    if (!rawValue) return "";
    return rawValue
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .join(",");
  });

  const queryKey = computed(() => queryKeys.poi.byIds(normalizedIdsCsv.value));

  return useQuery<PoisByIdsResponse>({
    queryKey,
    queryFn: async () => {
      const ids = normalizedIdsCsv.value;
      if (!ids) {
        return [];
      }

      const res = await client.api.pois["by-ids"].$get({
        query: { ids },
      });

      if (!res.ok) {
        throw new Error("获取场地图片失败");
      }

      return await res.json();
    },
    enabled: () => normalizedIdsCsv.value.length > 0,
  });
};
