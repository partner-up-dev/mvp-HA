import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { PRId } from "@partner-up-dev/backend";

export const useGenerateXiaohongshuCaption = () => {
  return useMutation({
    mutationFn: async ({ prId, style }: { prId: PRId; style?: number }) => {
      const res = await client.api.llm["xiaohongshu-caption"].$post({
        json: { prId },
        query: style !== undefined ? { style: String(style) } : {},
      });

      if (!res.ok) {
        throw new Error("Failed to generate caption");
      }

      const data = (await res.json()) as {
        caption: string;
        posterStylePrompt: string;
      };
      return data;
    },
  });
};
