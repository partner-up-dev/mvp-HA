import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { PRId } from "@partner-up-dev/backend";

export type PosterHtmlResponse = {
  html: string;
  width: number;
  height: number;
  backgroundColor?: string;
  meta?: {
    keyText?: string;
  };
};

export const useGenerateXhsPosterHtml = () => {
  return useMutation({
    mutationFn: async (params: {
      prId: PRId;
      caption: string;
      posterStylePrompt: string;
    }): Promise<PosterHtmlResponse> => {
      const res = await client.api.share.xiaohongshu["poster-html"].$post({
        json: {
          prId: params.prId,
          caption: params.caption,
          posterStylePrompt: params.posterStylePrompt,
        },
      });

      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to generate XHS poster HTML");
      }

      return (await res.json()) as PosterHtmlResponse;
    },
  });
};
