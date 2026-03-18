import type { ApiErrorPayload } from "@/shared/api/error";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/oauth-login";

const WECHAT_AUTH_REQUIRED_CODE = "WECHAT_AUTH_REQUIRED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

export const isWeChatAuthRequiredError = (
  status: number,
  payload: ApiErrorPayload | null,
): boolean =>
  status === 401 &&
  (payload?.code === WECHAT_AUTH_REQUIRED_CODE ||
    payload?.code === WECHAT_BIND_REQUIRED_CODE);

export const handleWeChatAuthRequiredError = (
  status: number,
  payload: ApiErrorPayload | null,
  returnTo: string,
): boolean => {
  if (!isWeChatAuthRequiredError(status, payload)) {
    return false;
  }

  redirectToWeChatOAuthLogin(returnTo);
  return true;
};
