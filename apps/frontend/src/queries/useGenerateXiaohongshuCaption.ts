import { useMutation } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

export const useGenerateXiaohongshuCaption = () => {
  return useMutation({
    mutationFn: async ({
      prData,
      style,
    }: {
      prData: ParsedPartnerRequest;
      style?: number;
    }) => {
      const payload: any = { json: prData };
      if (style !== undefined) {
        // pass style as query param
        payload.query = { style: String(style) };
      }

      const res = await client.api.llm["xiaohongshu-caption"].$post(payload);

      if (!res.ok) {
        throw new Error("Failed to generate caption");
      }

      const data = await res.json();
      return data.caption as string;
    },
  });
};
