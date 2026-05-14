import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTHENTICATED_REQUIRED_CODE,
  handleAuthenticatedRequiredResponse,
  resetAuthenticatedRequiredRedirectStateForTest,
} from "./auth-required-policy";

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

test("AUTHENTICATED_REQUIRED policy uses the shared OAuth redirect single-flight", () => {
  const redirects: string[] = [];
  resetAuthenticatedRequiredRedirectStateForTest();
  installWindow((url) => redirects.push(url));

  try {
    const payload = {
      code: AUTHENTICATED_REQUIRED_CODE,
      detail: "Login required",
    };

    assert.equal(
      handleAuthenticatedRequiredResponse(
        401,
        payload,
        "https://partner-up.test/pr/1",
      ),
      true,
    );
    assert.equal(
      handleAuthenticatedRequiredResponse(
        401,
        payload,
        "https://partner-up.test/pr/2",
      ),
      true,
    );

    assert.deepEqual(redirects, [
      "/api/wechat/oauth/login?returnTo=https%3A%2F%2Fpartner-up.test%2Fpr%2F1",
    ]);
  } finally {
    resetAuthenticatedRequiredRedirectStateForTest();
    uninstallWindow();
  }
});
