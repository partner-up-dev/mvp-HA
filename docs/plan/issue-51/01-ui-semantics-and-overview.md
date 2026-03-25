# 01 - UI Semantics And Overview

## Goal

Fix user-facing state wording and overview rendering so `EXITED` and `RELEASED` are distinct and overview display only reflects active participants.

## Changes

1. Slot-state copy mapping
- In shared PR action slot-state resolver, map:
  - `RELEASED` -> "your slot was released"
  - `EXITED` -> "you exited this activity"
- Do not map both to a single release string.

2. Top notice card in Anchor PR page
- Keep notice visibility for both states.
- Render state-specific text based on `viewer.slotState` and/or `viewer.releasedSlot.state`.

3. Join-card tip text
- Reuse state-specific reason text:
  - auto-release reason for `RELEASED`
  - manual-exit reason for `EXITED`

4. Participation overview and preview chips
- Keep count based on `partnerSection.capacity.current` (already active-count based).
- Ensure roster chips in overview preview use active participants only.
- Avoid using the full mixed roster for compact overview chips.

## Files (expected)

- `apps/frontend/src/domains/pr/use-cases/useSharedPRActions.ts`
- `apps/frontend/src/pages/AnchorPRPage.vue`
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts` (if i18n schema keys change)

## Acceptance Criteria

- When user exited manually, all relevant notices/copy say exit semantics, not release semantics.
- When user was auto-released, copy remains release semantics.
- Overview compact chips do not show duplicate identity caused by history rows.
- Build passes.

## Risk

- Low. Mostly text/state mapping and data-source selection in frontend.
