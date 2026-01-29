import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

export type XiaohongshuStyle =
  | "friendly"
  | "concise"
  | "warm"
  | "trendy"
  | "professional";

export const useGenerateXiaohongshuCaption = () => {
  return useMutation({
    mutationFn: async ({
      prData,
      style,
    }: {
      prData: ParsedPartnerRequest;
      style?: XiaohongshuStyle;
    }) => {
      const res = await client.api.llm["xiaohongshu-caption"].$post({
        json: { ...prData, style },
      });

      if (!res.ok) {
        throw new Error("Failed to generate caption");
      }

      const data = await res.json();
      return data.caption;
    },
  });
};
