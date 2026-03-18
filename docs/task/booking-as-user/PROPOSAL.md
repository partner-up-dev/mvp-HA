# Proposal: Anchor PR Booking Contact via WeChat (Single Owner Model)

## 1. Updated Decision Summary

This proposal adopts two constraints as first-class design choices:

- Phone acquisition and validation use WeChat service-account capabilities only.
- Only one phone number is required per Anchor PR, owned by one partner (the first active partner).

This replaces the previous per-user collection idea.

## 2. Background

For many Anchor PR cases, `booking.handledBy = PLATFORM` currently means the platform acts as a booking agent, not a deeply integrated venue partner.

In that mode, venue-side booking operations need one reachable participant phone number.

Current gap:

- no explicit PR-level booking-contact owner concept,
- no WeChat-based phone verification flow in Anchor PR booking lifecycle,
- no clear user messaging about who must provide the phone and when it blocks actions.

## 3. Why This Direction Fits Current Product

- Anchor PR participation already depends on WeChat-authenticated identity (`openid`).
- Non-WeChat users are already outside the normal Anchor PR action path.
- Collecting one PR-level phone is simpler operationally than collecting every participant phone.

## 4. Domain Model (MVP)

Add a PR-scoped aggregate: `AnchorPRBookingContact`.

Suggested table: `anchor_pr_booking_contacts`

- `pr_id bigint primary key references partner_requests(id)`
- `owner_partner_id bigint not null references partners(id)`
- `owner_user_id uuid not null references users(id)`
- `phone_e164 text not null`
- `phone_masked text not null`
- `verified_source text not null default 'WECHAT_SERVICE_ACCOUNT'`
- `verified_at timestamptz not null`
- `updated_at timestamptz not null`

Notes:

- one row per Anchor PR,
- no raw phone exposure in read APIs,
- operation logs store masked value only.

## 5. Owner Rule

Define `booking contact owner` as the first active partner.

Active partner set: partner slots with `JOINED | CONFIRMED | ATTENDED`.

Owner election rule:

- owner candidate = active partner with smallest `partnerId`.

Practical implications:

- first joiner is owner candidate,
- if owner exits/releases, owner candidate is re-elected from remaining active partners,
- new owner candidate must provide WeChat-verified phone before confirm/booking-critical actions continue.

## 6. WeChat Phone Acquisition and Validation

### 6.1 Client flow

In WeChat WebView, owner candidate taps `Authorize phone`.

Frontend invokes service-account open capability and gets one-time credential (for example, code/encrypted payload based on final WeChat integration mode).

### 6.2 Server flow

Backend verifies credential with WeChat API and resolves canonical phone.

The system does not trust manually typed phone as verified booking contact in this mode.

If WeChat verification fails, return explicit business error and keep booking contact state as missing.

## 7. API Surface

### 7.1 New/updated endpoints

1. Resolve verified phone from WeChat capability:

- `POST /api/wechat/phone/resolve`

2. Upsert PR booking contact for owner candidate:

- `POST /api/apr/:id/booking-contact/verify`
- body example:

```json
{
  "wechatPhoneCredential": "..."
}
```

3. Extend Anchor PR detail/read model:

- `GET /api/apr/:id`
- `GET /api/apr/:id/booking-support`

Add block:

```ts
bookingContact: {
  required: boolean;
  state: "NOT_REQUIRED" | "MISSING" | "VERIFIED";
  ownerPartnerId: number | null;
  ownerIsCurrentViewer: boolean;
  maskedPhone: string | null;
  verifiedAt: string | null;
  deadlineAt: string | null;
}
```

### 7.2 Trigger condition

`bookingContact.required = true` when at least one support resource has:

- `booking.required = true`
- `booking.handledBy = PLATFORM`

## 8. Enforcement Policy

Recommended enforcement:

- First joiner path:
  - if booking contact is required, first join action must complete phone verification in flow.
- Non-owner joiners:
  - can still join after owner is established.
- Confirm action (`POST /api/apr/:id/confirm`):
  - blocked for all participants if required contact is missing.
- Auto-confirm window (`T-1h ~ T-30min`):
  - if required contact is missing, do not auto-confirm; return explicit blocking error.

This keeps booking preconditions deterministic before booking locks/triggers.

## 9. User Communication

### 9.1 Owner candidate view

Show high-priority card on `/apr/:id` and `/apr/:id/booking-support`:

- you are the booking contact owner for this PR,
- platform needs your phone to book as your agent,
- authorize phone in WeChat now,
- missing contact will block confirm/booking.

### 9.2 Non-owner view

Show informative state:

- booking contact is being provided by the owner,
- if missing, waiting for owner to authorize,
- no phone is shown except masked owner phone after verification.

## 10. Trade-Offs

### Benefit

- lower collection burden (one phone per PR),
- stronger phone authenticity from WeChat verification,
- aligned with current Anchor PR WeChat-first policy.

### Cost

- strict WeChat dependency for booking-contact completion,
- owner lifecycle/failover rules must be explicit,
- temporary blocking risk if owner does not complete authorization.

Mitigation:

- clear blocking copy,
- visible owner state,
- support escalation path (`/contact-support`) for operational rescue.

## 11. Rollout Plan

1. Add `anchor_pr_booking_contacts` schema + repository + read-model block.
2. Implement WeChat phone resolve endpoint and PR booking-contact verify endpoint.
3. Add owner-state cards on Anchor PR detail and booking-support pages.
4. Enable confirm/auto-confirm gate when contact is missing.
5. Add admin visibility fields (`hasBookingContact`, `ownerPartnerId`, `verifiedAt`).

## 12. Acceptance Criteria

- System can obtain and validate booking contact only through WeChat capability.
- For required PRs, exactly one owner phone is maintained at PR scope.
- Owner election follows first-active-partner rule and handles owner exit.
- Users see explicit reason, owner responsibility, and blocking impact.
- Confirm/auto-confirm behavior respects booking-contact requirement.
- Read APIs expose masked contact state only.

## 13. Non-Goals

- No per-user phone collection for all participants.
- No SMS OTP channel in MVP.
- No deep venue API integration in this proposal.
