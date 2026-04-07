import { computed } from "vue";
import {
  PUBLIC_CONFIG_KEYS,
  usePublicConfig,
} from "@/shared/config/queries/usePublicConfig";

const normalizeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

export const useWeChatBetaGroupQrCode = () => {
  const betaGroupQrCodeQuery = usePublicConfig(
    PUBLIC_CONFIG_KEYS.wechatBetaGroupQrCode,
  );

  const betaGroupQrCodeLoading = computed(
    () => betaGroupQrCodeQuery.isLoading.value,
  );

  const betaGroupQrCodeUrl = computed(() => {
    if (betaGroupQrCodeQuery.isLoading.value || betaGroupQrCodeQuery.error.value) {
      return null;
    }

    return normalizeHttpUrl(betaGroupQrCodeQuery.data.value?.value);
  });

  return {
    betaGroupQrCodeLoading,
    betaGroupQrCodeUrl,
  };
};
