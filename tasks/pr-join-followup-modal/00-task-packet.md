# PR Join Follow-Up Modal

## Objective & Hypothesis

Fix the PR join/waitlist success follow-up so it remains visible until the user completes it, and make modal scroll locking resilient when overlay components mount while another overlay already owns the body lock.

Hypothesis:

- The join/waitlist flow component is currently mounted only while the primary join/waitlist CTA exists.
- After a successful join or waitlist, PR detail refetch changes the viewer state, removes that CTA, and unmounts the flow component that owns the follow-up modal.
- Body scroll lock records `document.body.style.overflow` per caller. A closed modal that mounts during an active lock can capture `hidden` as its baseline and restore the page to `hidden`.

## Guardrails Touched

- Frontend PR detail page action assembly.
- PR join and waitlist flow component lifecycle.
- Shared overlay body scroll lock behavior.

## Verification

- `pnpm --filter @partner-up-dev/frontend build`
- Manual browser repro on `http://localhost:4001/pr/4`:
  - join success follow-up stays visible after backend success/refetch
  - closing follow-up restores page scroll
  - participant state remains updated after follow-up completion

## Verification Results

- `pnpm --filter @partner-up-dev/frontend build` passed.
- `agent-browser` repro at mobile viewport `390x844` passed:
  - after join success/refetch, notification follow-up modal stayed visible with `body overflow: hidden`
  - after subscription step completion, official-account follow-up stayed visible
  - after final follow-up completion, visible modal count was `0`, `body.style.overflow` was empty, computed body overflow was `visible`
  - page scrolled from `scrollY=0` to `scrollY=538`
- Follow-up E2E verification on `/pr/6` passed:
  - used a clean anonymous joiner and disabled route auto-login for that route in `sessionStorage`
  - after `加入 -> 确认加入`, the page had participant state (`确认参与` / `退出`) while the success notification modal remained visible
  - after the first `完成`, the official-account follow-up modal remained visible with body locked
  - after the final `完成`, modal count was `0`, `body.style.overflow` was empty, computed body overflow was `visible`
  - page scrolled from `scrollY=0` to `scrollY=538`
