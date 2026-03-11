import { computed, ref } from "vue";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

type WeChatSignatureResponse = {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
};

type ShareCardData = Pick<
  WeChatShareToChatPayload,
  "title" | "desc" | "link" | "imgUrl"
>;

const stripHash = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl.split("#")[0] ?? rawUrl;
  }
};

const WECHAT_SDK_URL = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";

const isWeChatSdkAvailable = (): boolean =>
  typeof window !== "undefined" && typeof wx !== "undefined";

let sdkLoadPromise: Promise<void> | null = null;

const loadWeChatSdk = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  if (isWeChatSdkAvailable()) return;
  if (sdkLoadPromise) return await sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[data-wechat-sdk="true"]`,
    );
    if (existingScript) {
      if (isWeChatSdkAvailable()) {
        resolve();
        return;
      }

      const timeoutId = window.setTimeout(() => {
        reject(new Error(i18n.global.t("errors.wechatSdkNotLoaded")));
      }, 8000);

      existingScript.addEventListener(
        "load",
        () => {
          window.clearTimeout(timeoutId);
          resolve();
        },
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => {
          window.clearTimeout(timeoutId);
          reject(new Error(i18n.global.t("errors.wechatSdkNotLoaded")));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = WECHAT_SDK_URL;
    script.async = true;
    script.dataset.wechatSdk = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(i18n.global.t("errors.wechatSdkNotLoaded")));
    document.head.appendChild(script);
  });

  try {
    await sdkLoadPromise;
  } catch (error) {
    sdkLoadPromise = null;
    throw error;
  }
};

export const useWeChatShare = () => {
  const isInitializing = ref(false);
  const isReady = ref(false);
  const initError = ref<string | null>(null);
  const configuredUrl = ref<string | null>(null);

  let initPromise: Promise<void> | null = null;

  const initWeChatSdk = async (): Promise<void> => {
    if (!isWeChatBrowser()) return;
    const currentUrl = stripHash(window.location.href);
    if (isReady.value && configuredUrl.value === currentUrl) return;

    if (configuredUrl.value && configuredUrl.value !== currentUrl) {
      isReady.value = false;
      initPromise = null;
    }

    if (initPromise) return await initPromise;

    initPromise = (async () => {
      isInitializing.value = true;
      initError.value = null;

      try {
        await loadWeChatSdk();

        if (!isWeChatSdkAvailable()) {
          throw new Error(i18n.global.t("errors.wechatSdkNotLoaded"));
        }

        const res = await client.api.wechat["jssdk-signature"].$get({
          query: { url: currentUrl },
        });

        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(
            payload.error ?? i18n.global.t("errors.wechatInitFailed"),
          );
        }

        const signature = (await res.json()) as WeChatSignatureResponse;

        await new Promise<void>((resolve, reject) => {
          wx?.config({
            debug: false,
            appId: signature.appId,
            timestamp: signature.timestamp,
            nonceStr: signature.nonceStr,
            signature: signature.signature,
            jsApiList: ["updateAppMessageShareData", "updateTimelineShareData"],
          });

          const timeoutId = window.setTimeout(() => {
            reject(new Error(i18n.global.t("errors.wechatInitTimeout")));
          }, 8000);

          wx?.ready(() => {
            window.clearTimeout(timeoutId);
            resolve();
          });

          wx?.error((error) => {
            window.clearTimeout(timeoutId);
            reject(
              new Error(
                i18n.global.t("errors.wechatInitError", {
                  message:
                    error instanceof Error
                      ? error.message
                      : i18n.global.t("common.operationFailed"),
                }),
              ),
            );
          });
        });

        isReady.value = true;
        configuredUrl.value = currentUrl;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : i18n.global.t("errors.initializeFailed");
        initError.value = message;
        isReady.value = false;
        configuredUrl.value = null;
        initPromise = null;
        throw new Error(message);
      } finally {
        isInitializing.value = false;
      }
    })();

    return await initPromise;
  };

  const setWeChatShareCard = async (data: ShareCardData): Promise<void> => {
    if (!isWeChatBrowser()) return;
    await initWeChatSdk();

    const link = stripHash(data.link);

    wx?.updateAppMessageShareData({
      title: data.title,
      desc: data.desc,
      link,
      imgUrl: data.imgUrl,
    });

    wx?.updateTimelineShareData({
      title: data.title,
      link,
      imgUrl: data.imgUrl,
    });
  };

  return {
    isWeChatBrowser: computed(() => isWeChatBrowser()),
    isInitializing: computed(() => isInitializing.value),
    isReady: computed(() => isReady.value),
    initError: computed(() => initError.value),
    initWeChatSdk,
    setWeChatShareCard,
  };
};
