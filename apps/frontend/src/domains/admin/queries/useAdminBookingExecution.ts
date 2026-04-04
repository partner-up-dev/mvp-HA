import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, unref, type MaybeRef } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type AdminApi = typeof adminClient.api.admin;
type BookingExecutionWorkspaceRoute = AdminApi["booking-execution"]["workspace"];
type AnchorPRsRoute = AdminApi["anchor-prs"];
type AnchorPRRoute = AnchorPRsRoute[":id"];

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
  AnchorPRRoute["booking-execution"]["$post"]
>;

export type ReleaseAdminAnchorPRPartnerResponse = InferResponseType<
  AnchorPRRoute["partners"][":partnerId"]["release"]["$post"]
>;

export type AdminBookingExecutionInput = {
  targetResourceId: number;
  result: "SUCCESS" | "FAILED";
  reason: string | null;
};

export type AdminAnchorPRPartnerReleaseInput = {
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
        throw new Error(await readErrorMessage(res, "获取预订执行工作台失败"));
      }
      return await res.json();
    },
    enabled: computed(() => unref(enabled)),
  });

export const useSubmitAdminAnchorPRBookingExecution = () => {
  const queryClient = useQueryClient();

  return useMutation<
    SubmitAdminBookingExecutionResponse,
    Error,
    { prId: number; input: AdminBookingExecutionInput }
  >({
    mutationFn: async ({ prId, input }) => {
      const res = await adminClient.api.admin["anchor-prs"][":id"][
        "booking-execution"
      ].$post({
        param: { id: prId.toString() },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "提交预订处理结果失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.bookingExecutionWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
      });
    },
  });
};

export const useReleaseAdminAnchorPRPartnerForExecution = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ReleaseAdminAnchorPRPartnerResponse,
    Error,
    { prId: number; partnerId: number; input: AdminAnchorPRPartnerReleaseInput }
  >({
    mutationFn: async ({ prId, partnerId, input }) => {
      const res = await adminClient.api.admin["anchor-prs"][":id"].partners[
        ":partnerId"
      ].release.$post({
        param: {
          id: prId.toString(),
          partnerId: partnerId.toString(),
        },
        json: input,
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "释放预订联系人失败"));
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.bookingExecutionWorkspace(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.anchorWorkspace(),
      });
    },
  });
};
