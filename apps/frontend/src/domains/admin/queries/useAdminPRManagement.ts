import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AdminApi = typeof adminClient.api.admin;
type PRWorkspaceRoute = AdminApi["pr"]["workspace"];
type PRsRoute = AdminApi["prs"];
type PRRoute = PRsRoute[":id"];
type PRMessagesRoute = PRRoute["messages"];
type PRMessageRoute = PRMessagesRoute[":messageId"];

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

export type CreateAdminPRResponse = InferResponseType<PRsRoute["$post"]>;

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
export type AdminPRMessagesResponse = InferResponseType<PRMessagesRoute["$get"]>;
export type UpdateAdminPRMessageResponse = InferResponseType<
  PRMessageRoute["$patch"]
>;
export type DeleteAdminPRMessageResponse = InferResponseType<
  PRMessageRoute["$delete"]
>;

export type AdminCreatePRInput = {
  timeWindow: [string | null, string | null];
  title: string | null;
  type: string;
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
  timeWindow: [string | null, string | null];
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

export type AdminUpdatePRMessageInput = {
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

export const useAdminPRMessages = (prId: MaybeRef<number | null>) =>
  useQuery<AdminPRMessagesResponse>({
    queryKey: computed(() => queryKeys.admin.prMessages(unref(prId))),
    queryFn: async () => {
      const resolvedPrId = unref(prId);
      if (resolvedPrId === null) {
        throw new Error("缺少 PR");
      }
      const res = await adminClient.api.admin.prs[":id"].messages.$get({
        param: { id: resolvedPrId.toString() },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "取得 PR 留言失敗"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(prId) !== null),
  });

export const useCreateAdminPR = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateAdminPRResponse, Error, AdminCreatePRInput>({
    mutationFn: async (input) => {
      const res = await adminClient.api.admin.prs.$post({
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorEventWorkspace(),
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
        queryKey: queryKeys.admin.anchorEventWorkspace(),
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

export const useUpdateAdminPRMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAdminPRMessageResponse,
    Error,
    { prId: number; messageId: number; input: AdminUpdatePRMessageInput }
  >({
    mutationFn: async ({ prId, messageId, input }) => {
      const res = await adminClient.api.admin.prs[":id"].messages[
        ":messageId"
      ].$patch({
        param: { id: prId.toString(), messageId: messageId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "更新留言失敗"));
      }
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prMessages(variables.prId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.messages(variables.prId),
      });
    },
  });
};

export const useDeleteAdminPRMessage = () => {
  const queryClient = useQueryClient();

  return useMutation<
    DeleteAdminPRMessageResponse,
    Error,
    { prId: number; messageId: number }
  >({
    mutationFn: async ({ prId, messageId }) => {
      const res = await adminClient.api.admin.prs[":id"].messages[
        ":messageId"
      ].$delete({
        param: { id: prId.toString(), messageId: messageId.toString() },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "刪除留言失敗"));
      }
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prMessages(variables.prId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.messages(variables.prId),
      });
    },
  });
};
