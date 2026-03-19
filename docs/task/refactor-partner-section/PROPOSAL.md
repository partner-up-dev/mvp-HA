# Proposal: Partner Section for Anchor / Community PR Pages

## Purpose

Design a single partner-focused section for `/cpr/:id` and `/apr/:id` that answers the user's core questions in one place:

1. Can I join or exit now?
2. How many partners are already in this PR?
3. Who else is already in?
4. What happens next after I join?

Today those answers are split across the facts card, action bar, reminder card, and anchor-only attendance panel. That separation matches implementation seams, not the user's decision flow.

## First-Principles Framing

A partner section exists to manage participation, not generic PR information.

From first principles, participation has four jobs:

- Show capacity: current count, min threshold, max ceiling, and whether the PR is still joinable.
- Show social proof: who is already in, including the creator when they occupy a slot.
- Show my state: not joined, joined, confirmed, attended, released, locked, or blocked by auth/time.
- Show my next action: join, exit, confirm, check in, enable reminders, or choose an alternative when full.

Anything outside that boundary should stay outside this section:

- PR content fields such as type, time, location, budget, notes
- creator-only content editing and status mutation
- sharing
- booking-support details themselves

The section may reference those systems when they affect participation, but it should not own them.

## Design Goals

- One mental model across Community PR and Anchor PR
- Shared structure first, scenario-specific extensions second
- Explicit system state, not hidden business rules
- Show real partner presence, not only raw counts
- Keep the primary CTA adjacent to the reason it is enabled or disabled
- Avoid inventing new domain concepts such as waitlists unless the backend model supports them

## Proposed Information Architecture

Place the partner section immediately below the main facts card on both PR pages.

The section should have one shared shell with four subareas:

### 1. Participation Summary

This is the top summary row.

- Title: `Partners`
- Capacity line: `2 joined, need 1 more to be ready, 1 slot left`
- Visual capacity meter:
  - current active partners
  - min threshold marker
  - max threshold marker when bounded
- Status hint:
  - `Open`
  - `Ready to start`
  - `Full`
  - `In progress`
  - `Closed / expired`

This replaces the partner-count responsibility currently buried inside the facts card.

### 2. Current Partners

This is the roster area.

- Show joined partners as lightweight profile chips/cards
- Show the creator badge when the creator occupies a slot
- Show `You` on the viewer's own slot
- Show empty placeholders for open slots when `maxPartners` is known
- If the PR is unbounded, show only active partners and omit placeholders

Recommended visibility level for MVP:

- avatar
- nickname
- role badge (`Creator`, `You`)
- slot state badge when useful (`Joined`, `Confirmed`, `Attended`)

Do not expose direct contact information here. The section should answer "who is in" without creating a new safety surface.

### 3. My Participation Card

This is the action area for the current viewer.

Possible contents:

- current personal state
- explanation of why the primary action is enabled or disabled
- primary CTA
- secondary CTA if allowed
- post-join utilities

Example states:

| Viewer state | Primary action | Secondary action | Notes |
| --- | --- | --- | --- |
| Anonymous / not WeChat-authenticated | `Login to join` | none | Explain join requires WeChat auth |
| Eligible and open | `Join` | none | Show remaining capacity |
| Joined on Community PR | none | `Exit` | Show reminder toggle after join |
| Joined on Anchor PR before confirm deadline | `Confirm participation` or `Joined` | `Exit` | Confirm becomes primary if still needed |
| Confirmed on Anchor PR before booking lock | none | `Exit` if still allowed | Explain deadline-based lock |
| Joined after event start on Anchor PR | `Check in` | maybe `Exit` hidden | Check-in replaces confirm |
| Full and not joined | none | alternative actions | No fake waitlist |
| Closed / expired | none | none | Show why no action is available |

### 4. Participation Rules / Timeline

This is a rule explainer, not a generic help block.

Shared rules:

- join/exit availability
- current capacity state
- reminder availability after join

Anchor-only rules:

- confirm deadline
- auto-release of unconfirmed slots
- join lock at `T-30min`
- booking-deadline-based exit lock for confirmed partners
- check-in only after start

Represent this as a compact timeline or ordered checklist, not as scattered paragraphs.

## Shared Core and Scenario Extensions

The section should be built as one shared module with scenario plug-ins.

### Shared core for Community + Anchor

- participation summary
- current partners roster
- join / exit logic
- viewer state messaging
- reminder toggle after join
- full / closed / expired disabled states

### Community extension

- no confirm
- no check-in
- simpler lifecycle copy

### Anchor extension

- confirm CTA and state
- check-in CTA and follow-up
- explicit deadlines
- full-state recovery actions:
  - same-batch alternatives
  - alternative batch recommendations

Those full-state recovery actions are partner-adjacent because they are the next valid participation path when direct join is impossible.

## What Should Move Out of the Current Action Bar

The current shared action bar mixes two different concerns:

- participant actions: join, exit
- creator ownership actions: edit content, modify status

The refactor should separate them.

- The partner section owns participant actions only.
- Creator actions should live in a separate `Creator Controls` section or remain near page-level management affordances.

That separation is important because "I am the creator" and "I am a participant" are not the same responsibility, even if one user can be both.

## Data / View-Model Requirements

The current public PR detail shape is enough for counts and `myPartnerId`, but not enough for a meaningful roster.

Current limitation:

- `core.partners` is only `number[]` of active slot IDs
- the UI can show "your slot id" but cannot answer "what other partners are there?" in human terms

Proposed partner-section view model:

```ts
type PartnerSectionView = {
  capacity: {
    current: number;
    min: number | null;
    max: number | null;
    remaining: number | null;
    readiness: "NEEDS_MORE" | "READY" | "FULL" | "ACTIVE" | "UNAVAILABLE";
  };
  viewer: {
    role: "GUEST" | "PARTICIPANT" | "CREATOR" | "CREATOR_PARTICIPANT";
    myPartnerId: number | null;
    state:
      | "NOT_JOINED"
      | "JOINED"
      | "CONFIRMED"
      | "ATTENDED"
      | "BLOCKED_AUTH"
      | "BLOCKED_FULL"
      | "BLOCKED_TIME"
      | "UNAVAILABLE";
    canJoin: boolean;
    canExit: boolean;
    canConfirm: boolean;
    canCheckIn: boolean;
    reminder: {
      visible: boolean;
      enabled: boolean;
      canToggle: boolean;
      reason: string | null;
    };
  };
  roster: Array<{
    partnerId: number;
    displayName: string;
    avatarUrl: string | null;
    isCreator: boolean;
    isSelf: boolean;
    state: "JOINED" | "CONFIRMED" | "ATTENDED";
  }>;
  emptySlots: number | null;
  rules: Array<{
    kind:
      | "CONFIRM_DEADLINE"
      | "JOIN_LOCK"
      | "BOOKING_EXIT_LOCK"
      | "CHECKIN_AVAILABLE"
      | "REMINDER_AVAILABLE";
    label: string;
    effectiveAt: string | null;
  }>;
};
```

This does not require exposing every internal field. It only exposes what the partner section needs to render stable UI states.

## API Design Guidance

Prefer deriving this view model server-side instead of recomputing scattered rules in the page.

Reasons:

- the backend already owns temporal refresh, auto-release, status recalculation, and anchor-specific lock rules
- the frontend should render reasons, not re-implement rule engines
- a server-derived view model reduces drift between Community and Anchor pages

Recommended approach:

- keep `core` for generic PR facts
- add a `partnerSection` block to both detail endpoints
- let anchor detail include anchor-only rule items and alternative actions inside that block

## UX Behavior Notes

- Show the roster before the CTA. Users decide faster when they see both social proof and remaining capacity.
- Keep the primary CTA sticky on mobile only if the section becomes long; do not create a second action system.
- When join is blocked, replace disabled ambiguity with explicit reason text:
  - `Login required`
  - `PR is full`
  - `Join closed 30 minutes before start`
  - `Exited locked after booking deadline`
- If a user is already joined, the section should shift from acquisition mode to commitment mode.

## Non-Goals

- No waitlist in this refactor
- No direct messaging or contact exchange in this section
- No creator editing controls inside the partner section
- No duplication of booking-support details or share tools

## Recommended Rollout

1. Introduce a shared `partnerSection` view model on PR detail responses.
2. Build one shared frontend section component with scenario-specific slots/extensions.
3. Move counts out of `PRFactsCard`.
4. Move join/exit/reminder/anchor attendance into the new section.
5. Move creator edit/status controls out of the participant action area.
6. Keep share and booking-support entry as separate sibling sections.

## Expected Outcome

After this refactor, the partner section becomes the single place where a user understands participation:

- whether joining is possible
- how full the PR is
- who is already in
- what commitment is expected next
- what fallback exists if direct joining is unavailable

That is a better domain boundary than the current UI split, and it preserves a shared model while still respecting real differences between Community PR and Anchor PR.
