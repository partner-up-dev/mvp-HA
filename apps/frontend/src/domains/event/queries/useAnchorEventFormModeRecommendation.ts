import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";

export const useAnchorEventFormModeRecommendation = () =>
  useMutation<
    AnchorEventFormModeRecommendationResponse,
    Error,
    {
      eventId: number;
      locationId: string;
      startAt: string;
      preferences: string[];
    }
  >({
    mutationFn: async ({ eventId, locationId, startAt, preferences }) => {
      const response = await client.api.events[":eventId"]["form-mode"][
        "recommendation"
      ].$post({
        param: {
          eventId: eventId.toString(),
        },
        json: {
          locationId,
          startAt,
          preferences,
        },
      });

      if (!response.ok) {
        throw new Error("获取推荐结果失败");
      }

      return await response.json();
    },
  });
