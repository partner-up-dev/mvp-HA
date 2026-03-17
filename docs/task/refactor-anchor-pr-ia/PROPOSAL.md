# Anchor PR Page IA Refactor Proposal

## 1. Context

Current `/apr/:id` composition is technically complete but IA-weak:

- Content is grouped by module ownership, not by user task flow.
- Most sections are information-heavy, but action anchors are either missing or buried.
- Secondary tasks (share, feedback/contact) are too close to primary tasks (join/manage).
- `PRPartnerSection` has become a mixed container for many unrelated jobs:
  - primary actions (`join/exit/confirm/check-in`)
  - state explanation (capacity/readiness/blocked reasons)
  - roster and timeline
  - reminder toggles
  - fallback alternatives

Result: users must parse before acting, and action clarity drops exactly where it matters.

## 2. Problem Statement

Refactor Anchor PR page IA from a module-first structure to a task-flow-first structure.

The new IA must:

1. Lead users through the primary task path first (`join/manage`).
2. Give each visible lane one clear primary action anchor.
3. Separate secondary tasks (`share`, `feedback`) from primary participation actions.
4. Keep existing Anchor PR domain semantics (`join/exit/confirm/check-in`, confirmation windows, booking lock rules).

## 3. Goals

- Reduce time-to-first-meaningful-action on `/apr/:id`.
- Make the "what should I do now?" answer obvious for every viewer state.
- Keep behavior stable while improving readability and maintainability of page composition.
- Preserve current backend contracts as much as possible.

## 4. Non-Goals

- No lifecycle rule change for Anchor PR participation.
- No redesign of `/apr/:id/booking-support` itself.
- No replacement of share implementations.
- No admin workflow redesign.

## 5. First-Principles IA Rules

- Task before module: section order follows user decisions, not component ownership.
- One lane, one main outcome: every lane has exactly one dominant action anchor.
- Progressive disclosure: detailed context appears after primary decision points.
- Hierarchy by intent:
  - primary: join/manage/confirm/check-in
  - supporting: booking/timeline/alternatives
  - secondary: share/feedback/contact

## 6. Target Information Architecture

### 6.1 Top-Level Lane Order

1. Decision Snapshot
2. Primary Action Lane
3. Next-Step Lane (state-driven)
4. Logistics Lane
5. Awareness Lane
6. Recovery Lane
7. Secondary Lane
8. Creator Tools Lane (conditional)

### 6.2 Lane Spec

| Lane | User question | Main content | Primary action anchor | Notes |
| --- | --- | --- | --- | --- |
| Decision Snapshot | "What is this and is it relevant?" | title, type, time, location, status, compact capacity | `Go to primary action` (scroll/inline jump) | Uses existing `PRHeroHeader + PRFactsCard` with compact framing |
| Primary Action Lane | "Can I join/manage now?" | slot state, blocked reason, minimal capacity signal | state-driven CTA (`Join` / `Confirm participation` / `Check in` / `View alternatives`) | Exactly one dominant button |
| Next-Step Lane | "What do I need to do next?" | current stage + nearest deadline + short instruction | stage CTA (`Confirm now` / `Submit check-in` / `Set reminder`) | No duplicate of primary CTA text |
| Logistics Lane | "What booking/funding constraints apply?" | booking-support preview + deadline | `View booking & support details` | Routes to `/apr/:id/booking-support` |
| Awareness Lane | "Who joined and what timeline applies?" | roster preview + expanded timeline | `View full roster` (expand) | Informational lane still has a clear anchor |
| Recovery Lane | "If blocked/full, where should I go?" | same-batch alternatives + other-batch options | `Switch to recommended slot` | Appears only when alternatives exist |
| Secondary Lane | "Do I want to share or give feedback?" | share methods + contact links | `Share this PR` | Visually demoted below primary/supporting lanes |
| Creator Tools Lane | "As creator, what can I edit?" | edit content/status actions | `Open creator tools` | Only for creator; never competes with participant primary CTA |

## 7. Primary Action Resolver (State Machine)

Create a single resolver in frontend (use-case layer) to avoid scattered CTA logic.

Recommended priority:

1. `canCheckIn` => `CHECK_IN`
2. `canConfirm` => `CONFIRM_SLOT`
3. `canJoin` => `JOIN`
4. `isParticipant && canExit && !canJoin && !canConfirm && !canCheckIn` => `EXIT_OR_STAY`
5. `!canJoin && hasAlternatives` => `VIEW_ALTERNATIVES`
6. fallback => `VIEW_BOOKING_SUPPORT`

Data can be derived from existing `partnerSection.viewer`, `partnerSection.fallbacks`, and anchor preview fields. No backend change is required for MVP.

## 8. Component Refactor Plan (Frontend)

### 8.1 Current-to-Target Split

- Keep:
  - `PRHeroHeader`
  - `PRFactsCard`
  - `PRShareSection` (moved to Secondary Lane)
- Refactor:
  - split `PRPartnerSection` into focused sections:
    - `APRPrimaryActionPanel`
    - `APRNextStepPanel`
    - `APRRosterTimelinePanel`
    - `APRReminderPanel` (or fold into Next-Step Lane)
    - `APRRecoveryPanel`
- Replace:
  - current mostly-disabled `AnchorPRActionsBar` with `APRCreatorToolsPanel` shown only when needed.

### 8.2 Page Composition Target

`AnchorPRPage.vue` should become a lane composer with clear order and minimal decision logic; action resolution lives in one use-case helper.

## 9. Copy and Visual Hierarchy Rules

- Primary lane button uses strongest visual treatment.
- Supporting lanes use neutral/outline style unless they are current-step critical.
- Secondary lane starts with a divider and softer heading to avoid accidental priority inversion.
- Blocked reasons should be shown adjacent to the blocked primary action, not buried in long notes.

## 10. Analytics Changes

Add IA-specific events:

- `anchor_pr_primary_cta_impression` (`ctaType`, `viewerState`)
- `anchor_pr_primary_cta_click` (`ctaType`, `viewerState`)
- `anchor_pr_lane_expand` (`laneId`)
- `anchor_pr_recovery_accept` (`targetType`, `targetPrId`)
- `anchor_pr_secondary_action_click` (`actionType`)

Primary KPI set:

- median time to first primary action
- first-screen primary CTA click-through
- join/confirm/check-in completion from detail page
- secondary-action click rate before primary completion (should decrease)

## 11. Rollout Plan

1. Phase 1: IA shell refactor only (lane order + component split, behavior unchanged).
2. Phase 2: primary action resolver + single dominant CTA.
3. Phase 3: secondary lane demotion + copy alignment.
4. Phase 4: analytics validation and cleanup of dead section logic.

## 12. Trade-Offs and Decision

### Option A: Keep monolithic `PRPartnerSection`, only reorder internals

- Pros: smallest code diff.
- Cons: keeps mixed responsibility and future change friction.

### Option B (Recommended): Split by task lanes and centralize CTA resolver

- Pros: clearer ownership, easier iteration, lower cognitive load for users and developers.
- Cons: moderate refactor cost and temporary component churn.

Decision: choose Option B for maintainability and IA clarity.

## 13. Acceptance Criteria

- `/apr/:id` sections are ordered by task flow, not module source.
- Every visible lane has one clear primary action anchor.
- For each viewer state, first viewport presents a single dominant CTA.
- Share and feedback actions are clearly below and visually weaker than join/manage actions.
- Existing Anchor PR behavior rules remain unchanged.
- Frontend build passes.
