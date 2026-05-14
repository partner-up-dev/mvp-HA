import assert from "node:assert/strict";
import test from "node:test";
import {
  requestWeChatOAuthLogin,
  resetWeChatOAuthLoginRedirectStateForTest,
} from "./oauth-login";

const installWindow = (replace: (url: string) => void): void => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        replace,
      },
    },
  });
};

const uninstallWindow = (): void => {
  Reflect.deleteProperty(globalThis, "window");
};

test("requestWeChatOAuthLogin single-flights redirect attempts", () => {
  const redirects: string[] = [];
  resetWeChatOAuthLoginRedirectStateForTest();
  installWindow((url) => redirects.push(url));

  try {
    assert.equal(requestWeChatOAuthLogin("https://partner-up.test/pr/1"), true);
    assert.equal(requestWeChatOAuthLogin("https://partner-up.test/pr/2"), true);

    assert.deepEqual(redirects, [
      "/api/wechat/oauth/login?returnTo=https%3A%2F%2Fpartner-up.test%2Fpr%2F1",
    ]);
  } finally {
    resetWeChatOAuthLoginRedirectStateForTest();
    uninstallWindow();
  }
});
