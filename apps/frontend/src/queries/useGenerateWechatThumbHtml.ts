import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { PRId } from "@partner-up-dev/backend";
import type { PosterHtmlResponse } from "./useGenerateXhsPosterHtml";

export const useGenerateWechatThumbHtml = () => {
  return useMutation({
    mutationFn: async (params: {
      prId: PRId;
      style?: number;
    }): Promise<PosterHtmlResponse> => {
      const res = await client.api.share["wechat-card"]["thumbnail-html"].$post(
        {
          json: {
            prId: params.prId,
            style: params.style,
          },
        },
      );

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(
          payload.error ?? "Failed to generate WeChat thumbnail HTML",
        );
      }

      return (await res.json()) as PosterHtmlResponse;
    },
  });
};
