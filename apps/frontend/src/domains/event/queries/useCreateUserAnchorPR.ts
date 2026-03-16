import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/useAutoWeChatLogin";

type CreateUserAnchorPRInput = {
  eventId: number;
  batchId: number;
  locationId: string;
};

type ProblemDetails = {
  status?: number;
  detail?: string;
  code?: string;
};

export type CreateUserAnchorPRResponse = {
  id: number;
  canonicalPath: string;
};

const isWeChatAuthProblem = (
  status: number,
  payload: ProblemDetails | null,
): boolean => status === 401 && payload?.code === "WECHAT_AUTH_REQUIRED";

export const useCreateUserAnchorPR = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateUserAnchorPRResponse,
    Error,
    CreateUserAnchorPRInput
  >({
    mutationFn: async ({ eventId, batchId, locationId }) => {
      const response = await client.api.events[":eventId"].batches[
        ":batchId"
      ]["anchor-prs"].$post(
        {
          param: {
            eventId: eventId.toString(),
            batchId: batchId.toString(),
          },
          json: { locationId },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!response.ok) {
        let payload: ProblemDetails | null = null;
        try {
          payload = (await response.json()) as ProblemDetails;
        } catch {
          payload = null;
        }

        if (isWeChatAuthProblem(response.status, payload)) {
          if (typeof window !== "undefined") {
            redirectToWeChatOAuthLogin(window.location.href);
          }
          throw new Error("需要先完成微信登录");
        }

        throw new Error(payload?.detail ?? "创建活动搭子请求失败");
      }

      return (await response.json()) as CreateUserAnchorPRResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorEvent.detail(variables.eventId),
      });
    },
  });
};
