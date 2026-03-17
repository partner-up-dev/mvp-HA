import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import {
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";
import { handleWeChatAuthRequiredError } from "@/processes/wechat/auth-error";

type CreateUserAnchorPRInput = {
  eventId: number;
  batchId: number;
  locationId: string;
};

export type CreateUserAnchorPRResponse = {
  id: number;
  canonicalPath: string;
};

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
        const payload = await readApiErrorPayload(response);

        if (
          typeof window !== "undefined" &&
          handleWeChatAuthRequiredError(
            response.status,
            payload,
            window.location.href,
          )
        ) {
          throw new Error(resolveApiErrorMessage(payload, "需要先完成微信登录"));
        }

        throw new Error(resolveApiErrorMessage(payload, "创建活动搭子请求失败"));
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
