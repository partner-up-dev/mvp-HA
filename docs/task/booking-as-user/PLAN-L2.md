# PLAN-L2: Anchor PR Booking Contact (WeChat-Only + Single Owner)

## 1. Frozen Decisions

This L2 plan is based on the latest confirmed direction:

- Phone acquisition and validation must use WeChat service-account capability only.
- Non-WeChat path is out of scope for booking-contact completion.
- Only one phone is required per Anchor PR.
- The booking-contact owner is the first active partner (smallest active `partnerId`).

Implication:

- We do not collect phone numbers for all partners.
- We do not add generic phone fields to `users`.

## 2. Target Behavior

## 2.1 Requirement trigger

`bookingContact.required = true` when Anchor PR has at least one support resource with:

- `booking.required = true`
- `booking.handledBy = PLATFORM`

## 2.2 Owner and lifecycle

- Owner candidate = active partner with minimum `partnerId` (`JOINED | CONFIRMED | ATTENDED`).
- If owner exits/releases, owner is re-elected by the same rule.
- If required contact is missing:
  - first-owner join flow must complete verification,
  - confirm is blocked for all,
  - auto-confirm on join is blocked.

## 2.3 User-facing outcome

- Owner sees: "you must authorize phone in WeChat" + CTA.
- Non-owner sees: "waiting for owner phone authorization".
- After verification: show masked phone only.

## 3. Data Model Design

## 3.1 New table

Add entity/table: `anchor_pr_booking_contacts`.

Suggested columns:

- `pr_id bigint primary key references partner_requests(id) on delete cascade`
- `owner_partner_id bigint not null references partners(id) on delete cascade`
- `owner_user_id uuid not null references users(id) on delete cascade`
- `phone_e164 text not null`
- `phone_masked text not null`
- `verified_source text not null default 'WECHAT_SERVICE_ACCOUNT'`
- `verified_at timestamptz not null`
- `updated_at timestamptz not null`

Suggested indexes/constraints:

- PK on `pr_id`
- index on `owner_user_id`

## 3.2 Backend entity/repository files

New files:

- `apps/backend/src/entities/anchor-pr-booking-contact.ts`
- `apps/backend/src/repositories/AnchorPRBookingContactRepository.ts`

Modified exports:

- `apps/backend/src/entities/index.ts`

Migration:

- create next schema migration in `apps/backend/drizzle/` (use `pnpm db:next-migration drizzle`)

## 4. Backend Domain Design

## 4.1 Domain placement

Place new logic in `apps/backend/src/domains/pr-booking-support/` to stay close to existing booking support logic.

New service files:

- `services/is-booking-contact-required.ts`
- `services/resolve-booking-contact-owner.ts`
- `services/resolve-booking-contact-state.ts`

New use case:

- `use-cases/verify-anchor-pr-booking-contact.ts`

## 4.2 WeChat phone verification adapter

Add service:

- `apps/backend/src/services/WeChatPhoneService.ts`

Responsibilities:

- accept one-time credential from frontend WeChat capability,
- call WeChat API,
- return normalized phone (`phoneE164`, `phoneMasked`),
- isolate provider-specific API shape.

Controller integration:

- add endpoint in `wechat.controller.ts`:
  - `POST /api/wechat/phone/resolve`
  - request: `{ credential: string }`
  - response: `{ phoneE164: string; phoneMasked: string }`

Note:

- `POST /api/apr/:id/booking-contact/verify` may call service directly (preferred), while `/api/wechat/phone/resolve` remains reusable.

## 4.3 Owner sync policy

Use lazy sync on read/action boundaries:

1. Compute current owner candidate (min active `partnerId`).
2. If no active partners: clear booking-contact row.
3. If row exists but `owner_partner_id` differs from candidate: clear row.
4. Recompute state as `MISSING` until new owner verifies.

This avoids stale owner state without adding background jobs.

## 4.4 Join flow changes (`join-pr.ts`)

Extend join input for Anchor route only:

- `POST /api/apr/:id/join`
- optional body: `{ wechatPhoneCredential?: string }`

Join logic changes (Anchor only):

1. Evaluate whether booking contact is required.
2. If not required: keep current behavior.
3. If required and current join is first active partner:
   - require `wechatPhoneCredential`,
   - verify via `WeChatPhoneService`,
   - after slot assignment, upsert booking contact row with joined partner as owner.
4. If required and join would auto-confirm (`T-1h ~ T-30min`) while contact is missing:
   - reject with business code `BOOKING_CONTACT_REQUIRED`.

Error codes:

- `BOOKING_CONTACT_OWNER_REQUIRED` (first owner join missing credential)
- `BOOKING_CONTACT_REQUIRED` (required contact missing for confirm/auto-confirm path)
- `WECHAT_PHONE_VERIFY_FAILED`

## 4.5 Confirm flow changes (`confirm-slot.ts`)

Before confirm state transition:

- if booking contact is required and state is not verified, reject `409 BOOKING_CONTACT_REQUIRED`.

## 4.6 Anchor read model changes

### `GET /api/apr/:id`

Extend `partnerSection` with booking-contact block:

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

Files:

- `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
- `apps/backend/src/domains/pr-core/services/partner-section-view.service.ts`

### `GET /api/apr/:id/booking-support`

Include same block under booking-support payload.

File:

- `apps/backend/src/domains/pr-booking-support/use-cases/get-anchor-pr-booking-support.ts`

## 4.7 New verify endpoint on Anchor PR

Add route:

- `POST /api/apr/:id/booking-contact/verify`

Request:

```json
{
  "wechatPhoneCredential": "..."
}
```

Behavior:

- require Anchor authenticated identity,
- require requester is current owner candidate,
- verify credential with WeChat service,
- upsert booking contact row,
- return masked result and owner info.

Controller file:

- `apps/backend/src/controllers/anchor-pr.controller.ts`

## 4.8 Error payload consistency

Current global error handler drops custom `code`. Frontend needs `code` for this flow.

Change in:

- `apps/backend/src/index.ts`

Behavior:

- when `HTTPException` has `code`, include `{ error, code }` in JSON body.

## 5. Frontend Low-Level Design

## 5.1 RPC/query layer changes

File:

- `apps/frontend/src/domains/pr/queries/useAnchorPR.ts`

Changes:

- update detail/booking-support response typings to include `bookingContact` block,
- extend `useJoinAnchorPR` mutation input to optional credential,
- add mutation `useVerifyAnchorPRBookingContact` for new endpoint,
- handle new error codes (`BOOKING_CONTACT_OWNER_REQUIRED`, `BOOKING_CONTACT_REQUIRED`).

## 5.2 WeChat credential adapter

Add frontend adapter for WeChat phone capability.

New file suggestion:

- `apps/frontend/src/shared/wechat/useWeChatPhoneCredential.ts`

Responsibilities:

- ensure running inside WeChat browser,
- obtain one-time credential via WeChat capability,
- return normalized credential string for backend verification.

Type updates:

- `apps/frontend/src/types/wechat-jssdk.d.ts` (add required API types for phone capability)

## 5.3 Join interception UX

Primary flow:

1. User taps `Join`.
2. Backend may return `BOOKING_CONTACT_OWNER_REQUIRED`.
3. Frontend opens phone-authorization modal.
4. Frontend obtains WeChat credential and retries `join` with credential.

New UI component:

- `apps/frontend/src/domains/pr/ui/modals/AnchorPRBookingContactVerifyModal.vue`

Page integration:

- `apps/frontend/src/pages/AnchorPRPage.vue`
- `apps/frontend/src/domains/pr/use-cases/useSharedPRActions.ts`

## 5.4 Lane/component updates

Add booking-contact panel to Anchor lanes (current page already split into lanes):

- `AnchorPRPrimaryActionLane.vue` (show blocking reason copy)
- `AnchorPRNextStepLane.vue` (show owner/missing/verified panel + verify CTA)
- `AnchorPRBookingSupportPage.vue` (same status card near overview)

Recommended rendering rules:

- owner + missing: show verify CTA,
- non-owner + missing: waiting state only,
- verified: masked phone + verified timestamp.

## 5.5 i18n keys

Modify:

- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts`

Add keys under `prPage.partnerSection` and `prBookingSupport` for:

- booking contact owner state,
- missing/verified messaging,
- WeChat-only verification prompts,
- error-specific helper text.

## 6. Concrete File Plan

## 6.1 Backend new

- `apps/backend/src/entities/anchor-pr-booking-contact.ts`
- `apps/backend/src/repositories/AnchorPRBookingContactRepository.ts`
- `apps/backend/src/services/WeChatPhoneService.ts`
- `apps/backend/src/domains/pr-booking-support/services/is-booking-contact-required.ts`
- `apps/backend/src/domains/pr-booking-support/services/resolve-booking-contact-owner.ts`
- `apps/backend/src/domains/pr-booking-support/services/resolve-booking-contact-state.ts`
- `apps/backend/src/domains/pr-booking-support/use-cases/verify-anchor-pr-booking-contact.ts`

## 6.2 Backend modify

- `apps/backend/src/controllers/anchor-pr.controller.ts`
- `apps/backend/src/controllers/wechat.controller.ts`
- `apps/backend/src/domains/pr-core/use-cases/join-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/confirm-slot.ts`
- `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
- `apps/backend/src/domains/pr-booking-support/use-cases/get-anchor-pr-booking-support.ts`
- `apps/backend/src/domains/pr-core/services/partner-section-view.service.ts`
- `apps/backend/src/index.ts` (error code passthrough)
- `apps/backend/src/entities/index.ts`
- `apps/backend/src/domains/pr-booking-support/index.ts`
- `apps/backend/src/domains/pr-anchor/use-cases/index.ts` (export new use case if needed)

## 6.3 Frontend new

- `apps/frontend/src/shared/wechat/useWeChatPhoneCredential.ts`
- `apps/frontend/src/domains/pr/ui/modals/AnchorPRBookingContactVerifyModal.vue`

## 6.4 Frontend modify

- `apps/frontend/src/types/wechat-jssdk.d.ts`
- `apps/frontend/src/domains/pr/queries/useAnchorPR.ts`
- `apps/frontend/src/domains/pr/use-cases/useSharedPRActions.ts`
- `apps/frontend/src/pages/AnchorPRPage.vue`
- `apps/frontend/src/pages/AnchorPRBookingSupportPage.vue`
- `apps/frontend/src/domains/pr/ui/sections/AnchorPRPrimaryActionLane.vue`
- `apps/frontend/src/domains/pr/ui/sections/AnchorPRNextStepLane.vue`
- `apps/frontend/src/locales/zh-CN.jsonc`
- `apps/frontend/src/locales/schema.ts`

## 7. Implementation Sequence

1. Schema/entity/repository for PR booking contact.
2. WeChat phone service + verify endpoint.
3. Join/confirm rule integration.
4. Anchor detail + booking-support read-model extensions.
5. Frontend mutation + modal + lane updates.
6. i18n + error mapping polish.

## 8. Verification Plan

Build checks:

- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/frontend build`

Manual scenarios:

1. Required PR, first join without credential -> `BOOKING_CONTACT_OWNER_REQUIRED`.
2. First join with valid WeChat credential -> join success + owner contact verified.
3. Required PR, owner missing, confirm attempt -> `BOOKING_CONTACT_REQUIRED`.
4. Required PR, owner verified, confirm works.
5. Owner exits -> owner re-election, state returns to missing until new owner verifies.
6. Booking-support page shows masked contact state consistently with detail page.
7. Non-WeChat environment cannot complete verification and shows explicit guidance.

## 9. Out of Scope for L2

- Any Admin visibility or Admin management changes for BookingContact.
- SMS/OTP fallback channel.
- Venue deep-integration API.
