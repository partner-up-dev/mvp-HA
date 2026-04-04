import { computed, ref } from "vue";
import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";
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
type InitWeChatSdkOptions = {
  jsApiList?: ReadonlyArray<WeChatJsApiName>;
  openTagList?: ReadonlyArray<WeChatOpenTagName>;
};

type WeChatSdkRequest = {
  url: string;
  configKey: string;
  jsApiList: WeChatJsApiName[];
  openTagList: WeChatOpenTagName[];
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

const WECHAT_SDK_URL = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
const DEFAULT_JS_API_LIST: ReadonlyArray<WeChatJsApiName> = [
  "updateAppMessageShareData",
  "updateTimelineShareData",
  "startRecord",
  "stopRecord",
  "onVoiceRecordEnd",
  "translateVoice",
];

const isWeChatSdkAvailable = (): boolean =>
  typeof window !== "undefined" && typeof wx !== "undefined";

let sdkLoadPromise: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;
let pendingInitKey: string | null = null;

const isInitializingRef = ref(false);
const isReadyRef = ref(false);
const initErrorRef = ref<string | null>(null);
const configuredUrlRef = ref<string | null>(null);
const configuredConfigKeyRef = ref<string | null>(null);

const normalizeJsApiList = (
  jsApiList: ReadonlyArray<WeChatJsApiName> | undefined,
): WeChatJsApiName[] =>
  Array.from(new Set([...(jsApiList ?? DEFAULT_JS_API_LIST)])).sort();

const normalizeOpenTagList = (
  openTagList: ReadonlyArray<WeChatOpenTagName> | undefined,
): WeChatOpenTagName[] => Array.from(new Set(openTagList ?? [])).sort();

const isRequestConfigured = (request: WeChatSdkRequest): boolean =>
  isReadyRef.value &&
  configuredUrlRef.value === request.url &&
  configuredConfigKeyRef.value === request.configKey;

const formatWeChatError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim().length > 0) return error;

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // Ignore serialization errors and use fallback text.
  }

  return i18n.global.t("common.operationFailed");
};

const invokeWeChatShareApi = async (
  apiName: "updateAppMessageShareData" | "updateTimelineShareData",
  invoke: (callbacks: {
    success?: () => void;
    fail?: (error: unknown) => void;
  }) => void,
): Promise<void> => {
  if (typeof window === "undefined") return;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve();
    }, 2000);

    const settle = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      callback();
    };

    const toError = (error: unknown): Error =>
      new Error(`${apiName} failed: ${formatWeChatError(error)}`);

    try {
      invoke({
        success: () => settle(resolve),
        fail: (error) => settle(() => reject(toError(error))),
      });
    } catch (error) {
      settle(() => reject(toError(error)));
    }
  });
};

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
  const initWeChatSdk = async (
    options: InitWeChatSdkOptions = {},
  ): Promise<void> => {
    if (!isWeChatBrowser()) return;

    const currentUrl = stripHash(window.location.href);
    const requestedJsApiList = normalizeJsApiList(options.jsApiList);
    const requestedOpenTagList = normalizeOpenTagList(options.openTagList);
    const requestedConfigKey = JSON.stringify({
      jsApiList: requestedJsApiList,
      openTagList: requestedOpenTagList,
    });

    const request: WeChatSdkRequest = {
      url: currentUrl,
      configKey: requestedConfigKey,
      jsApiList: requestedJsApiList,
      openTagList: requestedOpenTagList,
    };
    const requestKey = `${request.url}|${request.configKey}`;

    if (isRequestConfigured(request)) {
      return;
    }

    while (initPromise) {
      if (pendingInitKey === requestKey) {
        return await initPromise;
      }

      try {
        await initPromise;
      } catch {
        // Continue and allow the current request to retry initialization.
      }

      if (isRequestConfigured(request)) {
        return;
      }
    }

    pendingInitKey = requestKey;
    initPromise = (async () => {
      isInitializingRef.value = true;
      initErrorRef.value = null;

      try {
        await loadWeChatSdk();

        if (!isWeChatSdkAvailable()) {
          throw new Error(i18n.global.t("errors.wechatSdkNotLoaded"));
        }

        const res = await client.api.wechat["jssdk-signature"].$get({
          query: { url: request.url },
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
            jsApiList: request.jsApiList,
            openTagList: request.openTagList,
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

        isReadyRef.value = true;
        configuredUrlRef.value = request.url;
        configuredConfigKeyRef.value = request.configKey;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : i18n.global.t("errors.initializeFailed");
        initErrorRef.value = message;
        isReadyRef.value = false;
        configuredUrlRef.value = null;
        configuredConfigKeyRef.value = null;
        throw new Error(message);
      } finally {
        isInitializingRef.value = false;
        pendingInitKey = null;
        initPromise = null;
      }
    })();

    return await initPromise;
  };

  const setWeChatShareCard = async (data: ShareCardData): Promise<void> => {
    if (!isWeChatBrowser()) return;
    await initWeChatSdk();

    const link = stripHash(data.link);

    await Promise.all([
      invokeWeChatShareApi("updateAppMessageShareData", (callbacks) => {
        wx?.updateAppMessageShareData({
          title: data.title,
          desc: data.desc,
          link,
          imgUrl: data.imgUrl,
          ...callbacks,
        });
      }),
      invokeWeChatShareApi("updateTimelineShareData", (callbacks) => {
        wx?.updateTimelineShareData({
          title: data.title,
          link,
          imgUrl: data.imgUrl,
          ...callbacks,
        });
      }),
    ]);
  };

  return {
    isWeChatBrowser: computed(() => isWeChatBrowser()),
    isInitializing: computed(() => isInitializingRef.value),
    isReady: computed(() => isReadyRef.value),
    initError: computed(() => initErrorRef.value),
    initWeChatSdk,
    setWeChatShareCard,
  };
};
