# Task Packet - Issue 152 Anchor PR Page UI/UX

## MVT Core

- Objective & Hypothesis: solidify GitHub issue #152 into durable docs without changing backend-owned participation, messaging, or notification eligibility rules. Hypothesis: keeping `/apr/:id` focused on facts plus participation while moving messaging into `/apr/:id/messages` will reduce detail-page clutter without losing the existing subscription and profile-navigation loops.
- Guardrails Touched:
  - `docs/10-prd/behavior/workflows.md`
  - `docs/10-prd/behavior/scope.md`
  - `docs/10-prd/behavior/rules-and-invariants.md`
  - `docs/10-prd/behavior/capabilities.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - existing backend authority over join eligibility, participant visibility, notification quota, and PR message persistence
- Verification:
  - read current PRD and Product TDD anchors for Anchor PR detail, messaging, profile, and notification semantics
  - encode the accepted issue-152 decisions into durable docs only
  - confirm the stable route family now explicitly includes `/apr/:id/messages`
  - inspect git diff to verify changes stay under `docs/` and `tasks/` only

## Accepted Decisions Solidified

- Keep the `Anchor PR` detail page notification-subscriptions section permanently visible.
- Move the message experience into the dedicated route family `/apr/:id/messages`.
- Remove the detail-page "more information" section.
- Open the participant roster as a modal from the facts-card participant row.
- Align the venue-image entry to the same clickable label-row pattern used by other facts-card actions.
- Make participant badges clickable and route them to the existing participant profile page.
- Prompt the notification-subscription modal immediately after a successful `Anchor PR` join.

## Impact Handshake

- Address and Object:
  - `docs/10-prd/behavior/*` product-visible behavior and invariants for Anchor PR detail/message flow
  - `docs/20-product-tdd/cross-unit-contracts.md` stable route and frontend/backend assembly contract
  - `tasks/issue-152-anchor-pr-page-uiux/00-task-packet.md` volatile execution record
- State Diff:
  - from inline Anchor PR detail-page message entry and less-explicit detail-page IA
  - to dedicated Anchor PR message route plus explicit detail-page facts/subscription/profile-entry structure
- Blast Radius Forecast:
  - frontend route assembly for Anchor PR pages
  - frontend detail-page composition and join-success modal timing
  - no intended change to backend message persistence or notification eligibility semantics
- Invariants Check:
  - notification subscription remains quota-based, not a toggle
  - only current active participants can access PR messages
  - participant profile pages remain read-only
  - no new generic Anchor PR create route is introduced

## Notes

- Durable docs were solidified first; frontend implementation then followed in the same issue thread.

## Implementation Follow-up 2026-04-13

- Objective & Hypothesis: align the Anchor PR detail-page secondary actions with the agreed IA semantics. Hypothesis: rendering `查看资源补助` / `前往留言` / `分享 / 邀请` as neutral outline actions without persistent helper copy or divider-heavy row chrome will better signal "secondary utility" while keeping the persistent notification-subscription section distinct.
- Guardrails Touched:
  - `apps/frontend/src/pages/AnchorPRPage.vue`
  - keep the persistent notification-subscriptions section on `/apr/:id`
  - do not change join, exit, message-access, or notification-eligibility business rules
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - verify on `http://localhost:4001/apr/17` that the three utility actions render with `ui-button--tone-outline`
  - verify utility-action helper text is absent unless explicitly needed and that only the subscription section retains a visible section title

## Messages Page Follow-up 2026-04-13

- Objective & Hypothesis: make `/apr/:id/messages` feel like a dedicated page instead of a reused inline card. Hypothesis: removing the page-header subtitle, flattening the thread shell, and dropping per-message card borders will better match a full-page asynchronous conversation surface.
- Guardrails Touched:
  - `apps/frontend/src/pages/AnchorPRMessagesPage.vue`
  - `apps/frontend/src/domains/pr/ui/sections/AnchorPRMessageThread.vue`
  - keep Anchor PR message permissions, submission flow, and read-marker semantics unchanged
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - verify on `http://localhost:4001/apr/17/messages` that `.page-header__subtitle` is absent
  - verify `AnchorPRMessageThread` renders in page layout without an outline shell and without bordered message cards

## Messaging Layout Follow-up 2026-04-13

- Objective & Hypothesis: keep the messaging composer anchored near the page bottom while letting the message timeline absorb remaining height and scroll independently. Hypothesis: a flex column page shell plus a flexed timeline viewport will prevent long threads from stretching the whole route vertically.
- Guardrails Touched:
  - `apps/frontend/src/pages/AnchorPRMessagesPage.vue`
  - `apps/frontend/src/domains/pr/ui/sections/AnchorPRMessageThread.vue`
  - `apps/frontend/src/shared/ui/layout/FullScreenPageScaffold.vue`
  - `apps/frontend/src/shared/ui/forms/TextareaInput.vue`
  - `apps/frontend/src/domains/pr/ui/forms/NLPRForm.vue`
  - `apps/frontend/src/AGENTS.components.md`
  - `apps/frontend/src/shared/ui/AGENTS.md`
  - keep message submission, read-marker advancement, and natural-language PR create behavior unchanged
- Verification:
  - `pnpm --filter @partner-up-dev/frontend build`
  - verify on `http://localhost:4001/apr/17/messages` that page height is constrained (`scrollHeight == clientHeight`) and thread/viewport both resolve to flex growth
  - verify on `http://localhost:4001/apr/17/messages` that `FullScreenPageScaffold` resolves to viewport height with header/content/footer segmentation
  - verify on `http://localhost:4001/apr/17/messages` that the composer uses the shared textarea primitive
  - verify on `http://localhost:4001/cpr/new` that NL PR create still renders the shared textarea with char count
