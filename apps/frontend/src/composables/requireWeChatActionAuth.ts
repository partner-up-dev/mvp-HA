import {
  fetchOAuthSession,
  redirectToWeChatOAuthLogin,
} from "@/composables/useAutoWeChatLogin";

export const requireWeChatActionAuth = async (
  returnTo: string,
): Promise<boolean> => {
  const session = await fetchOAuthSession();
  if (session?.configured && !session.authenticated) {
    redirectToWeChatOAuthLogin(returnTo);
    return false;
  }

  return true;
};

