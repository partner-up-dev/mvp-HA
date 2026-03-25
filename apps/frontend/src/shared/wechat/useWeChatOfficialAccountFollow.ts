import { computed } from "vue";
import { i18n } from "@/locales/i18n";
import {
  PUBLIC_CONFIG_KEYS,
  usePublicConfig,
} from "@/shared/config/queries/usePublicConfig";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";
import { useWeChatShare } from "@/shared/wechat/useWeChatShare";

const FALLBACK_OFFICIAL_ACCOUNT_USERNAME = "Partner_Up_Official";

const normalizeOfficialAccountUsername = (
  value: string | null | undefined,
): string => value?.trim() ?? "";

export const useWeChatOfficialAccountFollow = () => {
  const { initWeChatSdk } = useWeChatShare();
  const officialAccountConfigQuery = usePublicConfig(
    PUBLIC_CONFIG_KEYS.wechatOfficialAccountUsername,
  );
  const configuredOfficialAccountUsername = computed(() =>
    normalizeOfficialAccountUsername(
      officialAccountConfigQuery.data.value?.value,
    ),
  );
  const officialAccountUsername = computed(
    () =>
      configuredOfficialAccountUsername.value ||
      FALLBACK_OFFICIAL_ACCOUNT_USERNAME,
  );
  const followSchemeUrl = computed(() => {
    const username = officialAccountUsername.value;
    if (!username) return null;

    return `weixin://dl/officialaccounts?scene=108&need_open_webview=1&username=${username}`;
  });

  const resolveOfficialAccountUsername = async (): Promise<string> => {
    const configuredUsernameFromCache = configuredOfficialAccountUsername.value;
    if (configuredUsernameFromCache) return configuredUsernameFromCache;

    const refetchResult = await officialAccountConfigQuery.refetch();
    const configuredUsername = normalizeOfficialAccountUsername(
      refetchResult.data?.value,
    );
    return configuredUsername || FALLBACK_OFFICIAL_ACCOUNT_USERNAME;
  };

  const followOfficialAccount = async (): Promise<void> => {
    if (!isWeChatAbilityEnv()) {
      throw new Error(i18n.global.t("errors.wechatFollowNotSupported"));
    }

    const username = await resolveOfficialAccountUsername();

    await initWeChatSdk({
      jsApiList: [
        "openOfficialAccountProfile",
        "updateAppMessageShareData",
        "updateTimelineShareData",
      ],
    });

    await new Promise<void>((resolve, reject) => {
      const handleResponse = (
        response: WeChatOpenOfficialAccountProfileResponse,
      ) => {
        const errMsg = response.err_msg ?? response.errMsg ?? "";
        if (errMsg && errMsg !== "openOfficialAccountProfile:ok") {
          reject(new Error(errMsg));
          return;
        }

        resolve();
      };

      if (typeof wx?.openOfficialAccountProfile === "function") {
        wx.openOfficialAccountProfile({ username }, handleResponse);
        return;
      }

      if (typeof wx?.invoke === "function") {
        wx.invoke("openOfficialAccountProfile", { username }, handleResponse);
        return;
      }

      reject(new Error(i18n.global.t("errors.wechatSdkNotLoaded")));
    });
  };

  return {
    followOfficialAccount,
    followSchemeUrl,
    isConfigured: computed(() => officialAccountUsername.value.length > 0),
    officialAccountUsername,
    configLoading: computed(() => officialAccountConfigQuery.isLoading.value),
  };
};
