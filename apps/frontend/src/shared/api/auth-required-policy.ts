import type { ApiErrorPayload } from "@/shared/api/error";
import { redirectToWeChatOAuthLogin } from "@/processes/wechat/oauth-login";

export const AUTHENTICATED_REQUIRED_CODE = "AUTHENTICATED_REQUIRED";

let authRedirectInProgress = false;

export const isAuthenticatedRequiredResponse = (
  status: number,
  payload: ApiErrorPayload | null,
): boolean =>
  status === 401 && payload?.code === AUTHENTICATED_REQUIRED_CODE;

export const handleAuthenticatedRequiredResponse = (
  status: number,
  payload: ApiErrorPayload | null,
  returnTo: string,
): boolean => {
  if (!isAuthenticatedRequiredResponse(status, payload)) {
    return false;
  }
  if (authRedirectInProgress) {
    return true;
  }

  authRedirectInProgress = true;
  redirectToWeChatOAuthLogin(returnTo);
  return true;
};

export const resetAuthenticatedRequiredRedirectStateForTest = (): void => {
  authRedirectInProgress = false;
};
