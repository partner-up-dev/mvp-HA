import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminPoisByIdsResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)["by-ids"]["$get"]
>;

export type AdminPoisResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)["$get"]
>;

export type UpsertAdminPoiResponse = InferResponseType<
  (typeof adminClient.api.admin.pois)[":poiId"]["$put"]
>;

export const useAdminPois = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminPoisResponse>({
    queryKey: queryKeys.admin.pois(),
    queryFn: async () => {
      const res = await adminClient.api.admin.pois.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 POIs 失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

const normalizeIdsCsv = (idsCsv: string): string =>
  idsCsv
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .join(",");

export const useAdminPoisByIds = (
  idsCsv: MaybeRef<string>,
  enabled: MaybeRef<boolean> = true,
) => {
  const normalizedIdsCsv = computed(() => normalizeIdsCsv(unref(idsCsv)));
  const queryKey = computed(() =>
    queryKeys.admin.poisByIds(normalizedIdsCsv.value),
  );

  return useQuery<AdminPoisByIdsResponse>({
    queryKey,
    queryFn: async () => {
      const ids = normalizedIdsCsv.value;
      if (!ids) {
        return [];
      }

      const res = await adminClient.api.admin.pois["by-ids"].$get({
        query: { ids },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 POIs 失败"));
      }

      return await res.json();
    },
    enabled: computed(() => unref(enabled) && normalizedIdsCsv.value.length > 0),
  });
};

export const useUpsertAdminPoi = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpsertAdminPoiResponse,
    Error,
    { poiId: string; gallery: string[] }
  >({
    mutationFn: async ({ poiId, gallery }) => {
      const res = await adminClient.api.admin.pois[":poiId"].$put({
        param: { poiId },
        json: { gallery },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "保存 POI Gallery 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.pois(),
      });
    },
  });
};
