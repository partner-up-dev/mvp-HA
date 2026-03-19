import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useWeChatShare } from "@/shared/wechat/useWeChatShare";
import {
  createMockWeChatPhoneCredential,
  isWeChatAbilityEnv,
  isWeChatAbilityMockingEnabled,
} from "@/shared/wechat/ability-mocking";

const isCancelError = (errMsg: string): boolean =>
  errMsg.includes("cancel");

const isUnsupportedError = (errMsg: string): boolean =>
  errMsg.includes("not support") ||
  errMsg.includes("permission") ||
  errMsg.includes("function not exist");

export const useWeChatPhoneCredential = () => {
  const { t } = useI18n();
  const { initWeChatSdk } = useWeChatShare();

  const requestPhoneCredential = async (): Promise<string> => {
    if (isWeChatAbilityMockingEnabled()) {
      return createMockWeChatPhoneCredential();
    }

    if (!isWeChatAbilityEnv()) {
      throw new Error(t("prPage.bookingContact.nonWechatHint"));
    }

    await initWeChatSdk({
      jsApiList: ["getPhoneNumber"],
    });

    const invoke = wx?.invoke;
    if (!invoke) {
      throw new Error(t("prPage.bookingContact.unsupportedHint"));
    }

    const response = await new Promise<WeChatInvokeGetPhoneNumberResponse>(
      (resolve, reject) => {
        try {
          invoke("getPhoneNumber", {}, (payload) => resolve(payload));
        } catch (error) {
          reject(error);
        }
      },
    );

    const credential =
      typeof response.code === "string" ? response.code.trim() : "";
    if (credential.length > 0) {
      return credential;
    }

    const errMsg =
      (typeof response.err_msg === "string" && response.err_msg) ||
      (typeof response.errMsg === "string" && response.errMsg) ||
      "";
    const normalizedErrMsg = errMsg.toLowerCase();
    if (isCancelError(normalizedErrMsg)) {
      throw new Error(t("prPage.bookingContact.userCancelled"));
    }
    if (isUnsupportedError(normalizedErrMsg)) {
      throw new Error(t("prPage.bookingContact.unsupportedHint"));
    }

    throw new Error(t("prPage.bookingContact.verifyFailed"));
  };

  return {
    isWeChatEnv: computed(() => isWeChatAbilityEnv()),
    requestPhoneCredential,
  };
};
