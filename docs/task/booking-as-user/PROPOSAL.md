# Proposal: Booking-As-User Agent for Anchor PR

## 1. Background

Today, for many Anchor PR cases, `booking.handledBy = PLATFORM` does not mean deep venue integration. In reality, the platform acts as a booking agent on behalf of the participant.

That creates an operational dependency: the platform needs the participant's phone number to place or adjust bookings with venue staff.

Current product and domain gaps:

- No explicit booking-contact requirement state in Anchor PR read models.
- No standardized flow to collect a phone number from Anchor PR partners.
- No clear user-facing explanation of why phone is needed and when it blocks booking.
- No stable operational visibility of missing phone contacts before booking deadlines.

## 2. Problem Statement

We need one coherent mechanism that does both:

1. Collect phone numbers from Anchor PR partners when platform-agent booking requires it.
2. Communicate requirement and impact clearly to users in the Anchor PR journey.

The mechanism must be minimal, maintainable, and aligned with existing Anchor PR lifecycle rules.

## 3. First-Principles Constraints

- Ask only for data needed to complete the concrete booking workflow.
- Explain purpose, scope, and timing at the point of action.
- Keep sensitive contact data in a booking-focused boundary, not in generic display surfaces.
- Do not leak phone numbers to other participants.
- Avoid a frontend-only rule engine; server should derive requirement states.
- Preserve current Anchor PR participation semantics as much as possible.

## 4. Proposed MVP Design

### 4.1 New Domain Concept: Booking Contact Requirement

Add a server-derived requirement block for Anchor PR:

- Requirement trigger:
  - At least one support resource where:
    - `booking.required = true`
    - `booking.handledBy = PLATFORM`
- Requirement output state (derived per viewer):
  - `NOT_REQUIRED`
  - `REQUIRED_MISSING`
  - `REQUIRED_PROVIDED`

Suggested read model shape:

```ts
bookingContact: {
  required: boolean;
  state: "NOT_REQUIRED" | "REQUIRED_MISSING" | "REQUIRED_PROVIDED";
  reason: "BOOKING_AS_USER_AGENT" | null;
  deadlineAt: string | null;
  maskedPhone: string | null;
  blocksJoin: boolean;
  blocksConfirm: boolean;
}
```

Expose this in:

- `GET /api/apr/:id`
- `GET /api/apr/:id/booking-support`

### 4.2 Data Model

Use a booking-scoped table instead of adding phone fields directly to `users`.

Suggested table: `user_booking_contacts`

- `user_id uuid primary key references users(id)`
- `phone_e164 text not null`
- `phone_masked text not null`
- `consent_version text not null`
- `consent_collected_at timestamptz not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Notes:

- Return masked phone only in read APIs.
- Keep operation logs masked.
- Encryption-at-rest can be introduced as a follow-up hardening step if required by compliance.

### 4.3 API Changes

1. Extend Anchor join endpoint input:

- `POST /api/apr/:id/join`
- Request body (optional fields):

```json
{
  "bookingContactPhone": "13800138000",
  "bookingContactConsentAccepted": true
}
```

2. Add explicit update endpoint:

- `PUT /api/apr/:id/booking-contact`
- Request body:

```json
{
  "phone": "13800138000",
  "consentAccepted": true
}
```

3. Validation and errors:

- Normalize to E.164 (`+86...`) and validate format.
- If booking contact is required and missing, return `409` with explicit business code, e.g. `BOOKING_CONTACT_REQUIRED`.

### 4.4 Frontend UX Flow

#### Entry points

- Anchor PR detail page (`/apr/:id`) partner section.
- Anchor booking-support page (`/apr/:id/booking-support`).
- Join action interception when requirement is missing.

#### User-facing behavior

- If `REQUIRED_MISSING`, show a prominent card:
  - Why: platform books as your agent for this event.
  - What: phone is required by venue-side booking flow.
  - Deadline: display effective booking deadline when available.
  - CTA: `Provide phone number`.
- On `Join` click, if required and missing:
  - open modal;
  - collect phone + consent;
  - submit and continue join.
- If `REQUIRED_PROVIDED`:
  - show masked phone (`138****8000`) and `Update` action.

#### Message principles

- Keep copy explicit and non-ambiguous:
  - phone is for booking operations only;
  - not shown to other partners;
  - missing phone may block booking-related actions.

### 4.5 Enforcement Policy

Recommended policy for reliability:

- Hard gate `join` when booking-contact requirement is active and phone is missing.
- Hard gate `confirm` for already-joined legacy participants if phone is still missing.

Why this policy:

- avoids auto-confirm edge cases in the `T-1h ~ T-30min` window;
- guarantees contact completeness before booking locks;
- keeps booking operations deterministic.

## 5. Trade-Offs and Decision

### Option A: Add phone directly to `users`

- Pros: fewer tables, quicker implementation.
- Cons: weak domain boundary, easier misuse outside booking context.

### Option B (Recommended): Booking-scoped contact table

- Pros: clearer boundary, safer evolution, explicit consent purpose.
- Cons: one extra table and join in read/write paths.

Decision: choose Option B for maintainability and domain clarity.

### Option C: Collect phone only after join (soft prompt)

- Pros: lower join friction.
- Cons: booking operations can still fail due to incomplete contact data.

Decision: do not use soft-only collection as default for MVP reliability.

## 6. Rollout Plan

1. Phase 1: Schema + backend APIs + read-model field (no hard gate).
2. Phase 2: Frontend cards/modal + join interception.
3. Phase 3: Enable hard gates for join/confirm.
4. Phase 4: Add admin visibility (`missingBookingContactCount`, participant-level contact status).

## 7. Acceptance Criteria

- Anchor PR returns booking-contact requirement state in detail and booking-support APIs.
- Users can provide/update phone from Anchor PR flow without leaving the page.
- When requirement is active, users see clear reason and deadline messaging.
- Phone is masked in all read surfaces and logs.
- Join/confirm enforcement works according to the chosen policy.
- Build passes for backend and frontend workspaces.

## 8. Non-Goals

- No direct venue API integration in this proposal.
- No partner-to-partner phone sharing.
- No SMS/OTP verification flow in MVP.
- No redesign of broader user profile system beyond booking-contact scope.
