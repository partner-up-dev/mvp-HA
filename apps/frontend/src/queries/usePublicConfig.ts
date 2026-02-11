import { useQuery } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

export const PUBLIC_CONFIG_KEYS = {
  authorWechatQrCode: "author_wechat_qr_code",
} as const;

export type PublicConfigKey =
  (typeof PUBLIC_CONFIG_KEYS)[keyof typeof PUBLIC_CONFIG_KEYS];

export const usePublicConfig = (key: PublicConfigKey) => {
  return useQuery({
    queryKey: ["public-config", key],
    queryFn: async () => {
      const res = await client.api.config.public[":key"].$get({
        param: { key },
      });

      if (!res.ok) {
        throw new Error(i18n.global.t("errors.fetchPublicConfigFailed"));
      }

      return await res.json();
    },
  });
};
