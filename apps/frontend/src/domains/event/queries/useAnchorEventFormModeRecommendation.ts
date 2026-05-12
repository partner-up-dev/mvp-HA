import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import { buildCorrelationHeaders } from "@/shared/telemetry/correlation";

export const useAnchorEventFormModeRecommendation = () =>
  useMutation<
    AnchorEventFormModeRecommendationResponse,
    Error,
    {
      eventId: number;
      locationId: string;
      startAt: string;
      preferences: string[];
      correlationId?: string;
    }
  >({
    mutationFn: async ({
      eventId,
      locationId,
      startAt,
      preferences,
      correlationId,
    }) => {
      const response = await client.api.events[":eventId"]["form-mode"][
        "recommendation"
      ].$post(
        {
          param: {
            eventId: eventId.toString(),
          },
          json: {
            locationId,
            startAt,
            preferences,
            correlationId,
          },
        },
        {
          init: {
            headers: buildCorrelationHeaders(correlationId),
          },
        },
      );

      if (!response.ok) {
        throw new Error("获取推荐结果失败");
      }

      return await response.json();
    },
  });
