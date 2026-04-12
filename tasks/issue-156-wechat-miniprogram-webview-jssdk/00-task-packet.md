# Issue 156 - WeChat Mini Program web-view JS-SDK Fallback

## Objective & Hypothesis

- Objective: prevent WeChat-only share and subscription operations from attempting unsupported official-account JS-SDK capabilities inside a WeChat Mini Program `web-view`.
- Hypothesis: Mini Program `web-view` supports only the official allowlisted JS-SDK subset. Official-account share metadata APIs and `wx-open-subscribe` should be treated as unavailable there, so the frontend should show a current-page QR code prompt before those operations.

## Guardrails Touched

- Typed input: `Reality`.
- Active mode: `Diagnose` -> `Execute`.
- Durable owner: frontend capability detection and fallback UX.
- Product TDD anchor: `docs/20-product-tdd/system-state-and-authority.md` says frontend owns browser capability detection and fallback UX.
- Local frontend constraints: keep changes under domain/shared boundaries; avoid backend API changes.

## Verification

- Official source checked: `https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html`.
- Local checks:
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` completed with exit code 0. It reported existing baseline-outside findings in unrelated files and existing shared UI sections; no issue-156-only token rule blocked the build.

## Result

- Mini Program `web-view` is detected through official signals: `window.__wxjs_environment === "miniprogram"`, `wx.miniProgram.getEnv`, and the documented `miniProgram` user-agent marker.
- Local testing can force the Mini Program `web-view` branch with `VITE_WECHAT_MINIPROGRAM_WEBVIEW_MOCKING_ENABLED=true`.
- Official-account share-card setup and `wx-open-subscribe` are skipped inside Mini Program `web-view`.
- The WeChat share method and notification subscription action show a current-page QR prompt before the blocked operation.
