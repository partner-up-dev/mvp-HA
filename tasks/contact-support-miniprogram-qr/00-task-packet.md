# Task Packet - Contact Support Mini Program QR

## MVT Core

- Objective & Hypothesis: make `/contact-support` use QR-code entrypoints instead of outbound links when opened inside a WeChat mini program webview, for both reimbursement staff and platform support. Hypothesis: reusing the existing mini-program environment detection plus frontend-generated QR codes from the already-configured outbound links is enough to switch the user-facing affordance without changing the normal browser path.
- Guardrails Touched:
  - Product PRD: `/contact-support` support-entry behavior is user-visible and environment-sensitive.
  - Frontend: support route CTA behavior, modal rendering, locale copy, mini-program detection reuse, and QR generation reuse.
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm --filter @partner-up-dev/backend build`

## Execution Notes

- Input Type: Intent.
- Active Mode: Execute.
- Scope Decision:
  - Keep ordinary browser / WeChat browser behavior on outbound support links unchanged.
  - In mini program webview only, open a QR modal instead of navigating to the external support URL.
  - Generate the QR in frontend from the already-configured support links instead of adding new public config keys.

## Outcome

- `/contact-support` now switches the reimbursement-staff and platform-support CTAs to QR modals when the page is opened inside a WeChat mini program webview.
- Ordinary browser and WeChat-browser behavior still uses the existing outbound links.
- Reused one shared QR-generation path so support entry and the existing mini-program "scan to open" flow follow the same rendering model.
- Documented the new mini-program support-entry behavior in PRD.

## Verification Outcome

- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Passed: `pnpm --filter @partner-up-dev/backend build`
