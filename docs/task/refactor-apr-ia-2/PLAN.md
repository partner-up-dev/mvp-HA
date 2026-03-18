# PLAN - AnchorPRPage IA Refactor v2

## 1. Objective

Refactor `/apr/:id` to an action-first, low-noise information architecture that:

- Removes redundant information (especially repeated time/timeline statements).
- Makes primary participation actions obvious and sequential.
- Demotes secondary actions (subscription/share/exit) so they do not compete with participation.
- Keeps frontend structure maintainable with explicit action state contracts.

## 2. Hard Requirements (Locked)

### 2.1 Information order

Render in this exact priority:

1. Type, status
2. Location, activity time
3. Preferences
4. Current participants (who joined), minimum required participants
5. Subsidy

### 2.2 Action order

Primary action flow:

1. Join
2. Booking contact verification (if required)
3. Confirm
4. Check-in
5. Reimbursement

Secondary action flow:

1. Notification subscription
2. Share/invite
3. Exit

### 2.3 Action gating rules

- Confirm:
  - Visible after user has joined.
  - Disabled before confirmation start time.
- Check-in:
  - Visible after user is confirmed.
  - Disabled before activity start time.
- Reimbursement:
  - Always visible.
  - Disabled before activity end and when no reimbursable resource exists.
- Exit:
  - Must require second confirmation.
- Notification subscription:
  - Layout must support future multiple subscription items (not single hard-coded switch).

## 3. Current IA Defects (Mapped)

1. Information redundancy:
- Time appears in multiple places (`facts`, `timeline`, booking summary), forcing repeated parsing.
- Explanatory copy is long and often repeats blocked reasons already encoded in state.

2. Hierarchy and layout issues:
- Content is fragmented across many cards with weak priority transitions.
- Share block is too visually strong relative to participation flow.

3. Action-state clarity issues:
- Some actions are hidden instead of shown-disabled, so users cannot see upcoming steps.
- Action progression is split across multiple lanes, reducing "what next" clarity.

## 4. Target IA v2

## 4.1 Page structure

1. **Core Snapshot Card** (single source of truth for core info)
- Type + Status
- Location + Activity Time (shown once)
- Preferences
- Participants summary: current count, roster preview, min required
- Subsidy summary

2. **Primary Action Flow Card**
- Ordered action stack:
  - Join
  - Booking contact verification
  - Confirm
  - Check-in
  - Reimbursement
- Each action row includes:
  - state badge (`Ready` / `Locked` / `Done`)
  - one-line reason when disabled
  - one main button

3. **Secondary Actions Card**
- Extensible subscription list
- Share/invite entry (collapsed by default)
- Exit entry (danger style, least visual weight in this card, requires confirm modal)

4. **Context Card (Optional/Collapsible)**
- Alternatives/recovery
- Detailed timeline and booking details
- Creator tools (only for creator)

Rule: the first screen on mobile must contain Core Snapshot + top of Primary Action Flow.

## 4.2 Anti-redundancy rules

- Time is rendered once in Core Snapshot. Other cards only reference deltas (for example, "opens in 30m"), not full duplicated time text.
- Status explanation copy is one sentence max per action.
- No lane may repeat the same blocked reason text already shown in Primary Action Flow.

## 5. Action Visibility and Enablement Matrix

| Action | Visible when | Enabled when | Disabled reason source |
| --- | --- | --- | --- |
| Join | Viewer not participant | `viewer.canJoin` | `viewer.joinBlockedReason` |
| Booking contact verify | booking contact is required and owner is current viewer | booking contact state is not verified | booking contact owner/state |
| Confirm | viewer is participant and slot state is at least `JOINED` | `viewer.canConfirm` | `viewer.confirmBlockedReason`; before confirm start -> show exact open time |
| Check-in | slot state is `CONFIRMED` or `ATTENDED` | `viewer.canCheckIn` | `viewer.checkInBlockedReason`; before event start -> show start time |
| Reimbursement | always | `reimbursement.eligible && reimbursement.canRequest` and activity ended | reimbursement reason (`NO_POSTPAID_SUPPORT`, `PR_NOT_CLOSED`, etc.) |
| Subscription item | item policy says visible | item policy says enabled | per-item state |
| Share/invite | always | always | none |
| Exit | viewer is participant | `viewer.canExit` | `viewer.exitBlockedReason`; click requires second confirm modal |

## 6. View Model Changes (Recommended for Maintainability)

Keep domain rules server-derived. Add an explicit action view model in Anchor PR detail payload:

```ts
type AnchorPRActionState = {
  join: { visible: boolean; enabled: boolean; reason: string | null };
  bookingContact: { visible: boolean; enabled: boolean; reason: string | null };
  confirm: { visible: boolean; enabled: boolean; reason: string | null; opensAt: string | null };
  checkIn: { visible: boolean; enabled: boolean; reason: string | null; opensAt: string | null };
  reimbursement: { visible: true; enabled: boolean; reason: string | null };
  exit: { visible: boolean; enabled: boolean; reason: string | null; requiresSecondConfirm: true };
  subscriptions: Array<{
    key: string;
    title: string;
    description: string;
    visible: boolean;
    enabled: boolean;
    stateLabel: string;
    actionLabel: string;
  }>;
};
```

If backend extension is deferred, frontend can derive this VM from existing `partnerSection`, booking contact, and reimbursement query, but target should remain server-owned.

## 7. Frontend Refactor Plan

## Phase A - IA shell replacement

- Replace current multi-lane composition in `apps/frontend/src/pages/AnchorPRPage.vue` with:
  - `APRCoreSnapshotCard`
  - `APRPrimaryActionFlow`
  - `APRSecondaryActionsCard`
  - optional `APRContextCard`
- Remove duplicate timeline-heavy text from first-view lanes.

## Phase B - Action flow behavior

- Build `useAPRActionFlowState` use-case that maps backend state to ordered action rows.
- Show disabled states for confirm/check-in instead of hiding when future-step locked.
- Add exit second-confirm modal.

## Phase C - Subscription and share demotion

- Replace single reminder block with extensible list component `APRSubscriptionList`.
- Move share UI under secondary card and collapse it by default.
- Keep share functionality unchanged; change only IA placement and emphasis.

## Phase D - Reimbursement action integration

- Add reimbursement row to primary flow on AnchorPRPage.
- Reuse existing reimbursement status query.
- Button routes to `/apr/:id/booking-support` reimbursement area (or opens modal entry), with disabled reason shown inline.

## Phase E - Copy and telemetry cleanup

- Shorten action descriptions to one line.
- Keep/extend analytics:
  - `anchor_pr_primary_cta_impression`
  - `anchor_pr_primary_cta_click`
  - `anchor_pr_secondary_action_click`
  - new: `anchor_pr_action_disabled_impression` (action key + reason code)

## 8. Backend Alignment Tasks

1. Ensure confirm/check-in blocked reasons are stable and machine-readable.
2. Verify reimbursement gating aligns with "before activity end disabled":
- If `PR_NOT_CLOSED` is not equivalent to "activity not ended", add explicit reason and timestamp support.
3. Provide subscription items as a list-ready structure for future expansion.

## 9. Acceptance Criteria

1. Information appears in required order with no repeated full time blocks.
2. Primary action flow order is fixed as requested.
3. Confirm/check-in/reimbursement follow required visibility and disabled behavior.
4. Exit always requires second confirmation.
5. Subscription UI supports multiple items without layout rewrite.
6. Share/invite is clearly secondary and no longer competes with primary flow.
7. Frontend and backend builds pass:
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/backend build`

## 10. Delivery Sequence

1. IA shell + component split.
2. Action state VM + disabled-state rendering.
3. Secondary action demotion + extensible subscription list.
4. Reimbursement row integration.
5. Copy cleanup, analytics, and build verification.
