import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AdminApi = typeof adminClient.api.admin;
type AnchorEventsRoute = AdminApi["anchor-events"];
type AnchorEventWorkspaceRoute = AnchorEventsRoute["workspace"];
type AnchorEventRoute = AnchorEventsRoute[":eventId"];

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminAnchorEventWorkspaceResponse = InferResponseType<
  AnchorEventWorkspaceRoute["$get"]
>;

export type CreateAdminAnchorEventResponse = InferResponseType<
  AnchorEventsRoute["$post"]
>;

export type UpdateAdminAnchorEventResponse = InferResponseType<
  AnchorEventRoute["$patch"]
>;

export type AdminAnchorRecurringStartRuleInput = {
  id: string;
  kind: "RECURRING";
  weekdays: number[];
  timeOfDay: string;
};

export type AdminAnchorAbsoluteStartRuleInput = {
  id: string;
  kind: "ABSOLUTE";
  startAt: string;
};

export type AdminAnchorTimePoolConfigInput = {
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  startRules: Array<
    AdminAnchorRecurringStartRuleInput | AdminAnchorAbsoluteStartRuleInput
  >;
};

export type AdminAnchorEventInput = {
  title: string;
  type: string;
  description: string | null;
  locationPool: string[];
  timePoolConfig: AdminAnchorTimePoolConfigInput;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  coverImage: string | null;
  betaGroupQrCode: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export const useAdminAnchorEventWorkspace = (
  enabled: MaybeRef<boolean> = true,
) =>
  useQuery<AdminAnchorEventWorkspaceResponse>({
    queryKey: queryKeys.admin.anchorEventWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin["anchor-events"].workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "取得活動管理資料失敗"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useCreateAdminAnchorEvent = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAdminAnchorEventResponse,
    Error,
    AdminAnchorEventInput
  >({
    mutationFn: async (input) => {
      const res = await adminClient.api.admin["anchor-events"].$post({
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "建立活動失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useUpdateAdminAnchorEvent = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminAnchorEventResponse,
    Error,
    { eventId: number; input: AdminAnchorEventInput }
  >({
    mutationFn: async ({ eventId, input }) => {
      const res = await adminClient.api.admin["anchor-events"][
        ":eventId"
      ].$patch({
        param: { eventId: eventId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新活動失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};
