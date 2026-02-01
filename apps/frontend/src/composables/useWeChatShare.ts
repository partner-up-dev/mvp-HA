import { computed, ref } from "vue";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { client } from "@/lib/rpc";

type WeChatSignatureResponse = {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
};

type ShareCardData = {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
};

const stripHash = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl.split("#")[0] ?? rawUrl;
  }
};

const isWeChatSdkAvailable = (): boolean =>
  typeof window !== "undefined" && typeof wx !== "undefined";

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
        if (!isWeChatSdkAvailable()) {
          throw new Error("WeChat JS-SDK not loaded");
        }

        const res = await client.api.wechat["jssdk-signature"].$get({
          query: { url: currentUrl },
        });

        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to init WeChat JS-SDK");
        }

        const signature = (await res.json()) as WeChatSignatureResponse;

        await new Promise<void>((resolve, reject) => {
          wx?.config({
            debug: true,
            appId: signature.appId,
            timestamp: signature.timestamp,
            nonceStr: signature.nonceStr,
            signature: signature.signature,
            jsApiList: ["updateAppMessageShareData", "updateTimelineShareData"],
          });

          const timeoutId = window.setTimeout(() => {
            reject(new Error("WeChat JS-SDK init timeout"));
          }, 8000);

          wx?.ready(() => {
            window.clearTimeout(timeoutId);
            resolve();
          });

          wx?.error((error) => {
            window.clearTimeout(timeoutId);
            reject(
              new Error(
                `WeChat JS-SDK init error: ${error instanceof Error ? error.message : "unknown"}`,
              ),
            );
          });
        });

        isReady.value = true;
        configuredUrl.value = currentUrl;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Init failed";
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
