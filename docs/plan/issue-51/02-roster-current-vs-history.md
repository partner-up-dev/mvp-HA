# 02 - Roster Current vs History

## Goal

Separate partner roster into clear "current partners" and "history partners" groups.

## Changes

1. Data grouping strategy
- Current partners:
  - states in `JOINED/CONFIRMED/ATTENDED`
- History partners:
  - states in `EXITED/RELEASED`

2. UI structure
- Keep "Current partners" card always visible.
- Add "History partners" as either:
  - separate card, or
  - collapsible section (default collapsed).
- Preserve existing avatar/name/tags rendering.

3. Link behavior
- Current partners keep profile link behavior.
- History entries stay non-linkable unless product decision changes.

4. Count labels
- Current card count = number of current partners.
- History card count = number of historical partners.

## Files (expected)

- `apps/frontend/src/domains/pr/ui/sections/PRPartnerSection.vue`
- `apps/frontend/src/domains/pr/ui/sections/AnchorPRAwarenessLane.vue`
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts` (if new i18n keys are introduced)

## Acceptance Criteria

- Current and history are visibly split.
- History can be visually de-emphasized (collapsed or separate low-priority section).
- Manual testing clearly shows user can distinguish current roster vs historical participation.
- Build passes.

## Risk

- Medium. Mostly component refactor and i18n updates.
