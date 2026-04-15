# Task Packet - Frontend Build Chunk Size Warning

## MVT Core

- Objective & Hypothesis: remove the frontend Vite chunk size warning by reducing the single `vendor` chunk and delaying page-specific code. Hypothesis: the warning is caused by current `manualChunks` grouping every `node_modules` package into one `vendor` chunk while `src/app/router.ts` synchronously imports every route page.
- Guardrails Touched:
  - `apps/frontend/vite.config.ts` owns production bundle chunk strategy
  - `apps/frontend/src/app/router.ts` owns route component loading
  - `apps/frontend/src/domains/share/use-cases/poster/*` owns poster generation and should only load `html2canvas` when poster rendering is requested
  - `apps/frontend/src/shared/wechat/useQrCodeDataUrl.ts` owns QR code generation and should only load `qrcode` when active generation is requested
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - inspect build output for chunks above 500 kB
  - verify TypeScript still accepts lazy route components and dynamic dependency imports

## Execution Notes

- Input Type: Reality
- Active Mode: Diagnose -> Execute
- Evidence:
  - baseline `pnpm --filter @partner-up-dev/frontend build` produced `vendor-BKjoNycF.js` at 545.34 kB minified / 161.96 kB gzip
  - sourcemap grouping showed major `vendor` contributors: `html2canvas` (~400 KiB source), `@vue/runtime-core` (~262 KiB), `zod` (~146 KiB), `vee-validate` (~138 KiB), `vue-router` (~105 KiB), `vue-i18n` (~84 KiB), `@tanstack/query-core` (~79 KiB), `pinia` (~72 KiB), and `qrcode` (~71 KiB)
  - `src/app/router.ts` statically imported all route pages, so route-specific form/admin/share code entered the main module graph
- Scope Decision:
  - do not raise `build.chunkSizeWarningLimit`; that would hide the warning rather than reduce chunk pressure
  - split framework, form validation, poster rendering, QR code, and remaining vendor dependencies into named chunks
  - convert route page components to lazy imports
  - dynamically load `html2canvas` and `qrcode` at the action boundary where possible
- Result:
  - `pnpm --filter @partner-up-dev/frontend build` passes
  - Vite no longer reports chunk size warnings
  - largest JS chunks after optimization: `vendor-framework` 222.73 kB, `vendor-poster-rendering` 202.38 kB, `share` 104.30 kB, `vendor-validation` 88.88 kB, `index` 15.11 kB
