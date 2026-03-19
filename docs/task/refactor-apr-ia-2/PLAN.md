# PLAN - AnchorPRPage IA Refactor v3 (First-Principles Redesign)

## 1. First-Principles Framing

The page must answer only three questions, in order:

1. Is this the right PR for me right now?
2. What is the one action I should do now?
3. If I cannot do it now, when/how can I do it?

Design implications:

- Keep identity info lightweight in header (`title + type + status`).
- Keep high-interest context grouped (`location + time + preferences + participation overview`).
- Keep complex/low-priority finance context separate (`subsidy/reimbursement`).
- Limit prominent actions to at most two at once.
- Never hide future-step actions silently; show disabled with a clear tip.

## 2. Locked Requirements

## 2.1 Information priorities

1. Type, status (with title in header)
2. Location, activity time
3. Preferences
4. Current participants (who), minimum required
5. Subsidy

## 2.2 Action priorities

Primary chain:

1. Join
2. Confirm
3. Check-in
4. Reimbursement

Constraint:

- Booking Contact is not a peer action; it is a required step inside Join flow.

Secondary chain:

1. Notification subscription
2. Share/invite
3. Exit (second confirmation required)

## 2.3 State rules

- Confirm: visible after joined; disabled before confirmation start.
- Check-in: visible after confirmed; disabled before activity start.
- Reimbursement: always visible; disabled before activity end or when no reimbursable resource.
- Notification subscriptions: list layout must be extensible to multiple items.

## 3. IA v3 Blueprint

## 3.1 Top-level structure (mobile-first)

1. **Header Strip** (lightweight identity)
- Back
- Title
- Type badge
- Status badge
- Creator quick entry (if creator): `[Manage]` or `[Edit]`

2. **Context Card: Event Fit**
- Location
- Time
- Preferences
- Participation overview:
  - current participants count
  - minimum required
  - compact roster preview (avatar + name chips)

3. **Subsidy Card** (separate, closer to reimbursement)
- subsidy headline
- compact highlights
- reimbursement availability hint
- reimbursement button (always visible, can be disabled with reason)

4. **Action Dock** (at most two prominent actions)
- Slot A: Primary action (Now)
- Slot B: Secondary action (Next/Utility)
- Disabled states always show tip text

5. **Utility Card**
- Notification subscriptions (extensible list)
- Share/invite entry (low visual emphasis)
- Exit entry (danger, second-confirm modal)

6. **Optional Context (collapsed by default)**
- alternatives/recovery
- detailed timeline
- booking-support deep details

## 3.2 Priority discipline

- Header carries identity, not heavy explanations.
- Event Fit card is the core "decision context" block.
- Subsidy is intentionally isolated to avoid polluting core decision context.
- Utilities never visually compete with primary action.

## 4. Interaction Model

## 4.1 Two-prominent-actions cap

At any moment, show no more than two prominent controls:

- Primary: single strongest CTA for current stage.
- Secondary: one adjacent utility/next step.

Everything else remains low-emphasis rows/links.

## 4.2 Join flow with embedded Booking Contact

`Join` click opens a 2-step modal/sheet:

1. Step 1: Join confirmation summary
2. Step 2 (conditional): booking contact verify/authorize if required

Outcome:

- If booking contact verification succeeds, join completes in same flow.
- No standalone Booking Contact action row on main page.

## 4.3 Disabled-action tips

- Every disabled primary-chain action must render one-line reason directly below control.
- Tips use concrete time/value:
  - Confirm: "Opens at 18:00"
  - Check-in: "Available after event starts at 19:00"
  - Reimbursement: "Available after event end" or "No reimbursable resource"

## 5. Wireframes

## 5.1 Participant Wireframe (Mobile)

```text
+----------------------------------------------------------------------------------+
| [Back]  PR Title                                         [Type] [Status]        |
+----------------------------------------------------------------------------------+
| EVENT FIT                                                                        |
| -------------------------------------------------------------------------------- |
| Location: XX Court                                                               |
| Time: 2026-03-21 19:00-21:00                                                     |
| Preferences: [Beginner] [Friendly pace]                                          |
| Participation: 3 joined | Min required: 4                                        |
| Roster: [A] [B] [You]                                                            |
+----------------------------------------------------------------------------------+
| SUBSIDY & REIMBURSEMENT                                                          |
| -------------------------------------------------------------------------------- |
| Subsidy: Postpaid reimbursement up to CNY 30                                     |
| Hint: Request available after event ends                                         |
| [Reimbursement] (disabled)                                                       |
| tip: Event not ended yet                                                         |
+----------------------------------------------------------------------------------+
| ACTION DOCK                                                                      |
| -------------------------------------------------------------------------------- |
| Primary (Now): [Confirm] (disabled)                                              |
| tip: Confirmation opens at 2026-03-21 18:00                                      |
| Secondary: [Subscribe Reminder]                                                  |
+----------------------------------------------------------------------------------+
| UTILITIES                                                                        |
| -------------------------------------------------------------------------------- |
| Subscriptions                                                                    |
| - Official account reminder                    [On/Off]                          |
| - (Future subscription item placeholder)       [--]                              |
| Share / Invite                               [Open]                              |
| Exit PR                                      [Exit] -> second confirm modal      |
+----------------------------------------------------------------------------------+
| OPTIONAL CONTEXT (collapsed)                                                     |
| -------------------------------------------------------------------------------- |
| [Expand] Alternatives / Timeline / Booking details                               |
+----------------------------------------------------------------------------------+
```

## 5.2 Creator Wireframe (Mobile)

```text
+----------------------------------------------------------------------------------+
| [Back]  PR Title                          [Type] [Status]   [Manage] [Edit]      |
+----------------------------------------------------------------------------------+
| EVENT FIT                                                                        |
| -------------------------------------------------------------------------------- |
| Location / Time / Preferences / Participation overview                           |
+----------------------------------------------------------------------------------+
| SUBSIDY & REIMBURSEMENT                                                          |
| -------------------------------------------------------------------------------- |
| Subsidy summary + [Reimbursement]                                                |
+----------------------------------------------------------------------------------+
| ACTION DOCK                                                                      |
| -------------------------------------------------------------------------------- |
| Primary (Now): [Manage Participants]                                             |
| Secondary: [Cancel Activity] or [Participant Action]                             |
| (still max 2 prominent controls)                                                 |
+----------------------------------------------------------------------------------+
| UTILITIES                                                                        |
| -------------------------------------------------------------------------------- |
| Subscriptions / Share / Exit (low emphasis)                                      |
+----------------------------------------------------------------------------------+
```

Creator-specific rule:

- Management entry must be near header, not hidden in bottom optional context.

## 6. Stage-to-Action Mapping (Participant)

| Stage | Primary action | Secondary action | Disabled tip requirement |
| --- | --- | --- | --- |
| Not joined | Join | Subscribe reminder or Share | If Join disabled, show reason |
| Joined, before confirm window | Confirm (disabled) | Subscribe reminder | show confirm open time |
| Joined, inside confirm window | Confirm | Subscribe reminder | none if enabled |
| Confirmed, before event start | Check-in (disabled) | Subscribe reminder | show event start time |
| Confirmed, event started | Check-in | Share/invite | none if enabled |
| Event ended | Reimbursement (enabled or disabled by resource) | Share/invite | show reimbursement reason if disabled |

## 7. Data and Component Changes

## 7.1 Frontend composition target

- `AnchorPRPage.vue` becomes role-aware composer:
  - `APRHeaderStrip`
  - `APREventFitCard`
  - `APRSubsidyCard`
  - `APRActionDock`
  - `APRUtilitiesCard`
  - `APRContextCollapse`

## 7.2 Use-case layer

- Add `useAPRRoleAwareActions`:
  - resolves `primaryAction`, `secondaryAction`
  - enforces max-two-prominent-actions
  - provides disabled tips

- Add `useAPRJoinFlow`:
  - handles modal step sequence
  - embeds booking contact verification inside join

## 7.3 Backend/view-model alignment (recommended)

- Keep blocked reasons machine-readable.
- Ensure reimbursement reason can explicitly represent:
  - activity not ended
  - no reimbursable resource
- Provide list-ready subscription items (not single hard-coded toggle).

## 8. Delivery Phases

1. IA shell rewrite (header/event-fit/subsidy/action-dock/utilities).
2. Role-aware action resolver with two-action cap.
3. Join modal with embedded booking-contact step.
4. Subsidy-reimbursement proximity and disabled-tip polish.
5. Creator quick entries near header.
6. Utility demotion and extensible subscription list.
7. Build verification.

## 9. Acceptance Criteria

1. Header includes title/type/status and creator quick entry (if creator).
2. Event Fit card contains only location/time/preferences/participation overview.
3. Subsidy is in a separate card near reimbursement action.
4. Booking contact is integrated into join flow, not shown as peer action.
5. Page shows at most two prominent actions at once.
6. Disabled primary-chain actions always include one-line tips.
7. Confirm/check-in/reimbursement visibility and disabled behavior match locked rules.
8. Exit requires second confirmation.
9. Notification subscription UI supports future multiple items.
10. Frontend/backend build passes:
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/backend build`
