import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AdminApi = typeof adminClient.api.admin;
type BookingExecutionWorkspaceRoute = AdminApi["booking-execution"]["workspace"];
type PRsRoute = AdminApi["prs"];
type PRRoute = PRsRoute[":id"];

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export type AdminBookingExecutionWorkspaceResponse = InferResponseType<
  BookingExecutionWorkspaceRoute["$get"]
>;

export type SubmitAdminBookingExecutionResponse = InferResponseType<
  PRRoute["booking-execution"]["$post"]
>;

export type ReleaseAdminPRPartnerResponse = InferResponseType<
  PRRoute["partners"][":partnerId"]["release"]["$post"]
>;

export type AdminBookingExecutionInput = {
  targetResourceId: number;
  result: "SUCCESS" | "FAILED";
  reason: string | null;
};

export type AdminPRPartnerReleaseInput = {
  reason: string;
};

export const useAdminBookingExecutionWorkspace = (
  enabled: MaybeRef<boolean> = true,
) =>
  useQuery<AdminBookingExecutionWorkspaceResponse>({
    queryKey: queryKeys.admin.bookingExecutionWorkspace(),
    queryFn: async () => {
      const res = await adminClient.api.admin["booking-execution"].workspace.$get();
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "取得預訂執行工作台失敗"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useSubmitAdminPRBookingExecution = () => {
  const queryClient = useQueryClient();

  return useMutation<
    SubmitAdminBookingExecutionResponse,
    Error,
    { prId: number; input: AdminBookingExecutionInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin.prs[":id"]["booking-execution"].$post({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "提交預訂處理結果失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.bookingExecutionWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};

export const useReleaseAdminPRPartnerForExecution = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ReleaseAdminPRPartnerResponse,
    Error,
    { prId: number; partnerId: number; input: AdminPRPartnerReleaseInput }
  >({
    mutationFn: async ({ prId, partnerId, input }) => {
      const res = await adminClient.api.admin.prs[":id"].partners[
        ":partnerId"
      ].release.$post({
        param: {
          id: prId.toString(),
          partnerId: partnerId.toString(),
        },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "釋放預訂聯絡人失敗"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.bookingExecutionWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.prWorkspace(),
      });
    },
  });
};
