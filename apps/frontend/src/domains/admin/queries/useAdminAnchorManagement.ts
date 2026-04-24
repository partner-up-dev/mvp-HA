import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AdminApi = typeof adminClient.api.admin;
type PRWorkspaceRoute = AdminApi["pr"]["workspace"];
type AnchorEventsRoute = AdminApi["anchor-events"];
type AnchorEventRoute = AnchorEventsRoute[":eventId"];
type PRsRoute = AdminApi["prs"];
type PRRoute = PRsRoute[":id"];

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminPRWorkspaceResponse = InferResponseType<
  PRWorkspaceRoute["$get"]
>;

export type CreateAdminAnchorEventResponse = InferResponseType<
  AnchorEventsRoute["$post"]
>;

export type UpdateAdminAnchorEventResponse = InferResponseType<
  AnchorEventRoute["$patch"]
>;

export type CreateAdminPRResponse = InferResponseType<
  AnchorEventRoute["prs"]["$post"]
>;

export type UpdateAdminPRContentResponse = InferResponseType<
  PRRoute["content"]["$patch"]
>;

export type UpdateAdminPRStatusResponse = InferResponseType<
  PRRoute["status"]["$patch"]
>;

export type UpdateAdminPRVisibilityResponse = InferResponseType<
  PRRoute["visibility"]["$patch"]
>;

export type CreateAdminPRMessageResponse = InferResponseType<
  PRRoute["messages"]["$post"]
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
  systemLocationPool: string[];
  userLocationPool: Array<{
    id: string;
    perBatchCap: number;
  }>;
  timePoolConfig: AdminAnchorTimePoolConfigInput;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  coverImage: string | null;
  betaGroupQrCode: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export type AdminCreatePRInput = {
  timeWindow: [string | null, string | null];
  title: string | null;
  type: string | null;
  location: string;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
};

export type AdminUpdatePRContentInput = {
  title: string | null;
  type: string;
  location: string | null;
  minPartners: number | null;
  maxPartners: number | null;
  preferences: string[];
  notes: string | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
};

export type AdminUpdatePRStatusInput = {
  status: "OPEN" | "READY" | "ACTIVE" | "CLOSED";
};

export type AdminUpdatePRVisibilityInput = {
  visibilityStatus: "VISIBLE" | "HIDDEN";
};

export type AdminCreatePRMessageInput = {
  body: string;
};

export const useAdminPRWorkspace = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminPRWorkspaceResponse>({
    queryKey: queryKeys.admin.prWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin.pr.workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "取得 PR 管理資料失敗"));
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
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useCreateAdminPR = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAdminPRResponse,
    Error,
    { eventId: number; input: AdminCreatePRInput }
  >({
    mutationFn: async ({ eventId, input }) => {
      const res = await adminClient.api.admin["anchor-events"][
        ":eventId"
      ].prs.$post({
        param: { eventId: eventId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "建立 PR 失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useUpdateAdminPRContent = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminPRContentResponse,
    Error,
    { prId: number; input: AdminUpdatePRContentInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin.prs[":id"].content.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 PR 內容失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useUpdateAdminPRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminPRStatusResponse,
    Error,
    { prId: number; input: AdminUpdatePRStatusInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin.prs[":id"].status.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 PR 狀態失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useUpdateAdminPRVisibility = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminPRVisibilityResponse,
    Error,
    { prId: number; input: AdminUpdatePRVisibilityInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin.prs[":id"].visibility.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 PR 可見性失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useCreateAdminPRMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAdminPRMessageResponse,
    Error,
    { prId: number; input: AdminCreatePRMessageInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin.prs[":id"].messages.$post({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "發送系統留言失敗"));
      }
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.messages(variables.prId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prMessages(variables.prId),
      });
    },
  });
};
