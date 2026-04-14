import QRCode from "qrcode";
import { computed, ref, watch, type Ref } from "vue";
import { i18n } from "@/locales/i18n";

const resolveCurrentUrl = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.href;
};

export const useCurrentWebPageQrCode = (active: Readonly<Ref<boolean>>) => {
  const targetUrlRef = ref("");
  const qrCodeDataUrlRef = ref<string | null>(null);
  const qrCodeErrorRef = ref<string | null>(null);
  let generationId = 0;

  watch(
    active,
    async (isActive) => {
      const currentGenerationId = generationId + 1;
      generationId = currentGenerationId;
      if (!isActive) return;

      const targetUrl = resolveCurrentUrl();
      targetUrlRef.value = targetUrl;
      qrCodeDataUrlRef.value = null;
      qrCodeErrorRef.value = null;

      if (!targetUrl) {
        qrCodeErrorRef.value = i18n.global.t(
          "wechatMiniProgramWebView.qrFailed",
        );
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(targetUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
          color: {
            dark: "#111111",
            light: "#ffffff",
          },
        });
        if (currentGenerationId !== generationId) return;
        qrCodeDataUrlRef.value = dataUrl;
      } catch {
        if (currentGenerationId !== generationId) return;
        qrCodeErrorRef.value = i18n.global.t(
          "wechatMiniProgramWebView.qrFailed",
        );
      }
    },
    { immediate: true },
  );

  return {
    targetUrl: computed(() => targetUrlRef.value),
    qrCodeDataUrl: computed(() => qrCodeDataUrlRef.value),
    qrCodeError: computed(() => qrCodeErrorRef.value),
  };
};
