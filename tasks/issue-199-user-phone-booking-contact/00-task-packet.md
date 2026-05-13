# Task Packet - Issue 199 User Phone Booking Contact

## Objective & Hypothesis

Objective: make booking contact depend on the current user's phone number, so one user's phone number can be reused across PR booking flows and managed from the personal center.

Hypothesis: moving the phone authority to `users.phone_number` and removing `pr_booking_contacts` will simplify repeated booking-contact collection, while support-resource and PR participant ownership rules can derive the relevant contact from the selected participant/user state.

## Input Classification

- Input Type: `Intent`
- Active Mode: `Explore -> Solidify -> Execute`
- Durable Owner:
  - Product behavior: `docs/10-prd/behavior/*`
  - Business vocabulary: `docs/10-prd/glossary.md`
  - Cross-unit contract: `docs/20-product-tdd/cross-unit-contracts.md`
  - System state authority: `docs/20-product-tdd/system-state-and-authority.md`
  - Runtime implementation: backend user profile, PR join gates, booking support, admin booking execution, frontend personal center, frontend PR join modal.

## Current Facts

- Issue: https://github.com/partner-up-dev/mvp-HA/issues/199
- Current code has no `users.phone_number` field.
- Current booking-contact resolution is persisted in `pr_booking_contacts`.
- Current join-gate contract says `BOOKING_CONTACT` validates and records a PR booking contact phone.
- Current frontend asks for phone inside the PR join-gate modal and booking-support page.

## Confirmed Decisions

- `pr_booking_contacts` will be removed.
- Booking-support resources will depend on `users.phone_number` for contact phone data.
- Personal center needs a phone-number editing entry.
- The implementation should avoid requiring users to refill the same phone number for every PR.
- When an operator finds a booking contact phone invalid, the operator action clears `users.phone_number`.
- Booking support selects the earliest active participant with `users.phone_number` as the contact.
- A `BOOKING_CONTACT` gate is resolved when the PR already has an active participant with `users.phone_number`, or the current viewer has `users.phone_number`.

## Open Questions

- None for the current implementation slice.

## Migration Decisions

- Existing `pr_booking_contacts.phone_e164` values are backfilled to `users.phone_number` by `owner_user_id` before the table is dropped.
- Existing `pr_booking_executions.booking_contact_phone` values stay unchanged as historical execution snapshots.

## Candidate State Diff

- From: PR-scoped booking contact table stores owner user, owner partner, full phone, masked phone, verified source, verified time.
- To: user-scoped `users.phone_number` stores the contact phone; support-resource and booking execution reads derive the contact from user/participant ownership.

## Guardrails Touched

- User profile and identity data correctness.
- PR join-gate resolved-state semantics.
- Booking support and admin execution contact lookup.
- Operator release behavior for invalid booking contact.
- User-level phone clearing affects every future booking-contact flow for that user.
- Historical execution audit integrity.
- Cross-unit RPC contract for join-gate resolution and user profile editing.

## Verification

- `pnpm --filter @partner-up-dev/backend db:lint` passed.
- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm test:scenario backend` passed.
- Browser check against `https://partner-up.localhost/me` passed: the personal-center phone input and save button render in the profile form.

## Discussion Log

- 2026-05-13: Initial exploration found no existing `users.phone_number`; current booking-contact behavior is PR-scoped through `pr_booking_contacts`.
- 2026-05-13: User clarified that `pr_booking_contacts` should be removed, support resources should directly depend on `users`, and personal center should add phone editing.
- 2026-05-13: User clarified that invalid booking contact handling should clear `users.phone_number`.
- 2026-05-13: Confirmed replacement ownership rule: support resources use the earliest active participant with `users.phone_number`.
- 2026-05-13: Implemented `users.phone_number` authority, removed `pr_booking_contacts`, added profile phone editing, and updated join-gate, booking-support, admin execution, release, docs, migration, and scenario tests.
