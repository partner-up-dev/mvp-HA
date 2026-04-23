import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AdminApi = typeof adminClient.api.admin;
type AnchorWorkspaceRoute = AdminApi["anchor-pr"]["workspace"];
type AnchorEventsRoute = AdminApi["anchor-events"];
type AnchorEventRoute = AnchorEventsRoute[":eventId"];
type AnchorPRsRoute = AdminApi["anchor-prs"];
type AnchorPRRoute = AnchorPRsRoute[":id"];

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminAnchorWorkspaceResponse = InferResponseType<
  AnchorWorkspaceRoute["$get"]
>;

export type CreateAdminAnchorEventResponse = InferResponseType<
  AnchorEventsRoute["$post"]
>;

export type UpdateAdminAnchorEventResponse = InferResponseType<
  AnchorEventRoute["$patch"]
>;

export type CreateAdminAnchorPRResponse = InferResponseType<
  AnchorEventRoute["anchor-prs"]["$post"]
>;

export type UpdateAdminAnchorPRContentResponse = InferResponseType<
  AnchorPRRoute["content"]["$patch"]
>;

export type UpdateAdminAnchorPRStatusResponse = InferResponseType<
  AnchorPRRoute["status"]["$patch"]
>;

export type UpdateAdminAnchorPRVisibilityResponse = InferResponseType<
  AnchorPRRoute["visibility"]["$patch"]
>;

export type CreateAdminAnchorPRMessageResponse = InferResponseType<
  AnchorPRRoute["messages"]["$post"]
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

export type AdminCreateAnchorPRInput = {
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

export type AdminUpdateAnchorPRContentInput = {
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

export type AdminUpdateAnchorPRStatusInput = {
  status: "OPEN" | "READY" | "ACTIVE" | "CLOSED";
};

export type AdminUpdateAnchorPRVisibilityInput = {
  visibilityStatus: "VISIBLE" | "HIDDEN";
};

export type AdminCreateAnchorPRMessageInput = {
  body: string;
};

export const useAdminAnchorWorkspace = (enabled: MaybeRef<boolean> = true) =>
  useQuery<AdminAnchorWorkspaceResponse>({
    queryKey: queryKeys.admin.anchorWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin["anchor-pr"].workspace.$get();
      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "获取 Anchor 管理数据失败"),
        );
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
        throw new Error(await readErrorMessage(res, "创建活动失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
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
        throw new Error(await readErrorMessage(res, "更新活动失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
      });
    },
  });
};

export const useCreateAdminAnchorPR = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAdminAnchorPRResponse,
    Error,
    { eventId: number; input: AdminCreateAnchorPRInput }
  >({
    mutationFn: async ({ eventId, input }) => {
      const res = await adminClient.api.admin["anchor-events"][
        ":eventId"
      ]["anchor-prs"].$post({
        param: { eventId: eventId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建 PR 失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
      });
    },
  });
};

export const useUpdateAdminAnchorPRContent = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminAnchorPRContentResponse,
    Error,
    { prId: number; input: AdminUpdateAnchorPRContentInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin["anchor-prs"][
        ":id"
      ].content.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 PR 内容失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
      });
    },
  });
};

export const useUpdateAdminAnchorPRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminAnchorPRStatusResponse,
    Error,
    { prId: number; input: AdminUpdateAnchorPRStatusInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin["anchor-prs"][
        ":id"
      ].status.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 PR 状态失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
      });
    },
  });
};

export const useUpdateAdminAnchorPRVisibility = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminAnchorPRVisibilityResponse,
    Error,
    { prId: number; input: AdminUpdateAnchorPRVisibilityInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin["anchor-prs"][
        ":id"
      ].visibility.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 PR 可见性失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
      });
    },
  });
};

export const useCreateAdminAnchorPRMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAdminAnchorPRMessageResponse,
    Error,
    { prId: number; input: AdminCreateAnchorPRMessageInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin["anchor-prs"][":id"].messages.$post(
        {
          param: { id: prId.toString() },
          json: input,
        },
      );
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "发送系统留言失败"));
      }
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.messages(variables.prId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorPRMessages(variables.prId),
      });
    },
  });
};
