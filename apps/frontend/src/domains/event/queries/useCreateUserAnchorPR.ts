import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
  type ApiError,
} from "@/shared/api/error";
import {
  handleWeChatAuthRequiredError,
  isWeChatAuthRequiredError,
} from "@/processes/wechat/auth-error";
import { setPendingWeChatAction } from "@/processes/wechat/pending-wechat-action";

type CreateUserAnchorPRInput = {
  eventId: number;
  batchId: number;
  locationId: string;
};

export type CreateUserAnchorPRResponse = {
  id: number;
  canonicalPath: string;
};

export type CreateUserAnchorPRError = ApiError & {
  status?: number;
};

export const useCreateUserAnchorPR = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateUserAnchorPRResponse,
    CreateUserAnchorPRError,
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
          isWeChatAuthRequiredError(response.status, payload)
        ) {
          setPendingWeChatAction({
            kind: "ANCHOR_EVENT_CREATE",
            eventId,
            batchId,
            locationId,
          });
          handleWeChatAuthRequiredError(
            response.status,
            payload,
            window.location.href,
          );
        }
        const error = buildApiError(
          resolveApiErrorMessage(payload, "创建活动搭子请求失败"),
          payload,
        ) as CreateUserAnchorPRError;
        error.status = response.status;
        throw error;
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
