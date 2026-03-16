import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AdminApi = typeof adminClient.api.admin;
type AnchorWorkspaceRoute = AdminApi["anchor-pr"]["workspace"];
type AnchorEventsRoute = AdminApi["anchor-events"];
type AnchorEventRoute = AnchorEventsRoute[":eventId"];
type BatchesRoute = AdminApi["batches"];
type BatchRoute = BatchesRoute[":batchId"];
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

export type CreateAdminAnchorBatchResponse = InferResponseType<
  AnchorEventRoute["batches"]["$post"]
>;

export type UpdateAdminAnchorBatchResponse = InferResponseType<
  BatchRoute["$patch"]
>;

export type CreateAdminAnchorPRResponse = InferResponseType<
  BatchRoute["anchor-prs"]["$post"]
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

export type AdminAnchorEventInput = {
  title: string;
  type: string;
  description: string | null;
  systemLocationPool: string[];
  userLocationPool: Array<{
    id: string;
    perBatchCap: number;
  }>;
  coverImage: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export type AdminAnchorBatchInput = {
  timeWindow: [string | null, string | null];
  status: "OPEN" | "FULL" | "EXPIRED";
};

export type AdminCreateAnchorPRInput = {
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

export const useAdminAnchorWorkspace = (
  enabled: MaybeRef<boolean> = true,
) =>
  useQuery<AdminAnchorWorkspaceResponse>({
    queryKey: queryKeys.admin.anchorWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin["anchor-pr"].workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取 Anchor 管理数据失败"));
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
      const res = await adminClient.api.admin["anchor-events"][":eventId"].$patch({
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

export const useCreateAdminAnchorBatch = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateAdminAnchorBatchResponse,
    Error,
    { eventId: number; input: AdminAnchorBatchInput }
  >({
    mutationFn: async ({ eventId, input }) => {
      const res = await adminClient.api.admin["anchor-events"][":eventId"].batches.$post({
        param: { eventId: eventId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建批次失败"));
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

export const useUpdateAdminAnchorBatch = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminAnchorBatchResponse,
    Error,
    { batchId: number; input: AdminAnchorBatchInput }
  >({
    mutationFn: async ({ batchId, input }) => {
      const res = await adminClient.api.admin.batches[":batchId"].$patch({
        param: { batchId: batchId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新批次失败"));
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
    { batchId: number; input: AdminCreateAnchorPRInput }
  >({
    mutationFn: async ({ batchId, input }) => {
      const res = await adminClient.api.admin.batches[":batchId"]["anchor-prs"].$post({
        param: { batchId: batchId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "创建 Anchor PR 失败"));
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
      const res = await adminClient.api.admin["anchor-prs"][":id"].content.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "更新 Anchor PR 内容失败"),
        );
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
      const res = await adminClient.api.admin["anchor-prs"][":id"].status.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新 Anchor PR 状态失败"));
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
      const res = await adminClient.api.admin["anchor-prs"][":id"].visibility.$patch({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "更新 Anchor PR 可见性失败"),
        );
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
