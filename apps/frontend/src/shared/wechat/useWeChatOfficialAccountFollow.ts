import { computed } from "vue";
import { i18n } from "@/locales/i18n";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";
import { useWeChatShare } from "@/shared/wechat/useWeChatShare";

const OFFICIAL_ACCOUNT_USERNAME =
  (import.meta.env.VITE_WECHAT_OFFICIAL_ACCOUNT_USERNAME ?? "").trim();

const FOLLOW_SCHEME_URL = OFFICIAL_ACCOUNT_USERNAME
  ? `weixin://dl/officialaccounts?scene=108&need_open_webview=1&username=${OFFICIAL_ACCOUNT_USERNAME}`
  : null;

export const useWeChatOfficialAccountFollow = () => {
  const { initWeChatSdk } = useWeChatShare();

  const followOfficialAccount = async (): Promise<void> => {
    if (!OFFICIAL_ACCOUNT_USERNAME) {
      throw new Error(
        i18n.global.t("errors.wechatOfficialAccountUnavailable"),
      );
    }

    if (!isWeChatAbilityEnv()) {
      throw new Error(i18n.global.t("errors.wechatFollowNotSupported"));
    }

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
        wx.openOfficialAccountProfile(
          { username: OFFICIAL_ACCOUNT_USERNAME },
          handleResponse,
        );
        return;
      }

      if (typeof wx?.invoke === "function") {
        wx.invoke(
          "openOfficialAccountProfile",
          { username: OFFICIAL_ACCOUNT_USERNAME },
          handleResponse,
        );
        return;
      }

      reject(new Error(i18n.global.t("errors.wechatSdkNotLoaded")));
    });
  };

  return {
    followOfficialAccount,
    followSchemeUrl: FOLLOW_SCHEME_URL,
    isConfigured: computed(() => OFFICIAL_ACCOUNT_USERNAME.length > 0),
    officialAccountUsername: OFFICIAL_ACCOUNT_USERNAME,
  };
};
