export const isWeChatBrowser = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return /micromessenger/.test(ua);
};
