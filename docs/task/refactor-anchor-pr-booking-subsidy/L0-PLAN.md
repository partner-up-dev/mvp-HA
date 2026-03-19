# L0 Plan: Analyze Anchor PR Booking / Subsidy / Resource Refactor

## 1. User Intent Deconstruction

The requested refactor changes the Anchor PR economic model in five ways:

1. Booking and purchasing are different concepts and should not share one vague model.
2. The platform may provide non-cash support even when the user pays nothing, such as drinks, shuttlecocks, or study timers.
3. Existing Model A and Model C should be merged into one subsidy system:
   - the platform may help book;
   - users still bear the actual participation cost;
   - the platform reimburses later based on `subsidy ratio + subsidy cap`;
   - when booking requires prepayment, users may need to pay the platform first, and that amount offsets later subsidy settlement;
   - subsidy therefore becomes `platform prepays` vs `platform postpays`, not `partial subsidy` vs `full subsidy`.
4. Resources and bookings should become an independent domain/table instead of staying as loose snapshot fields on Anchor PR.
5. The current “economy” page should be redesigned and at minimum renamed toward “booking and subsidy”.

## 2. Current Codebase Reality

### 2.1 Backend storage is still built around a single economic snapshot

Current Anchor PR subtype table: `apps/backend/src/entities/anchor-partner-request.ts`

It stores these fields directly on `anchor_partner_requests`:

- `resourceBookingDeadlineAt`
- `paymentModelApplied`
- `discountRateApplied`
- `subsidyCapApplied`
- `cancellationPolicyApplied`
- `economicPolicyScopeApplied`
- `economicPolicyVersionApplied`

This is already a smell for the requested change, because one subtype row currently mixes:

- event/batch linkage
- visibility data
- booking policy
- subsidy policy

That makes “resource and booking as an independent domain” impossible without reshaping storage boundaries.

### 2.2 Anchor Event defaults still encode the old A/C model

Current event-level policy: `apps/backend/src/entities/anchor-event.ts`

Key fields:

- `paymentModel`
- `discountRateDefault`
- `subsidyCapDefault`
- `resourceBookingDeadlineRule`
- `cancellationPolicy`

Current batch-level override: `apps/backend/src/entities/anchor-event-batch.ts`

Key fields:

- `discountRateOverride`
- `subsidyCapOverride`
- `economicPolicyVersion`

Current policy resolution: `apps/backend/src/domains/pr-core/services/economic-policy.service.ts`

The resolver still returns:

- `paymentModelApplied`
- `discountRateApplied`
- `subsidyCapApplied`
- `cancellationPolicyApplied`
- `resourceBookingDeadlineAt`

So the current policy layer is not just “named badly”; it is structurally centered on the old model.

### 2.3 Reimbursement eligibility is hard-coupled to Model A

Current reimbursement read model: `apps/backend/src/domains/pr-core/use-cases/get-reimbursement-status.ts`

Critical rule:

- if `anchor.paymentModelApplied !== "A"`, reimbursement is rejected with `MODEL_NOT_REIMBURSEMENT`.

This directly conflicts with the requested merge of Model A and Model C. Under the new model, reimbursement/post-settlement should depend on subsidy settlement mode and actual user/payment state, not on a legacy binary model flag.

### 2.4 Booking deadline behavior already affects lifecycle rules

Current lifecycle coupling:

- `apps/backend/src/domains/pr-core/temporal-refresh.ts`
- `apps/backend/src/domains/pr-core/use-cases/exit-pr.ts`

Current behavior:

- booking deadline can force `LOCKED_TO_START`
- booking deadline can auto-release unconfirmed slots
- confirmed/attended users cannot exit after booking deadline

This means booking is not presentation-only. Any refactor that separates booking from subsidy must preserve these lifecycle hooks, or Anchor PR behavior will regress.

### 2.5 Frontend still exposes “economy” and A/C directly

Current route/page:

- `/apr/:id/economy`
- `apps/frontend/src/pages/AnchorPREconomyPage.vue`

Current detail-page entry:

- `apps/frontend/src/pages/AnchorPRPage.vue`

Current frontend assumptions:

- page title is “经济与预订规则”
- summary card labels `Model A / Model C`
- reimbursement card only renders when `paymentModelApplied === "A"`

There is also duplicated frontend query/type surface:

- `apps/frontend/src/queries/useAnchorPR.ts`
- `apps/frontend/src/queries/useAnchorPREconomy.ts`
- `apps/frontend/src/entities/pr/types.ts`
- `apps/frontend/src/entities/pr/detail.ts`

The duplicate economy query file looks redundant. It is not the main task, but it is a nearby maintainability issue.

## 3. First-Principles Domain Reframing

The user request implies the current “economy” concept should be split into at least three concerns:

1. Booking
   - whether something needs advance reservation
   - booking deadline
   - cancellation constraints
   - whether the platform helps make the booking
   - whether booking requires an upfront payment to be collected before attendance

2. Resource support
   - non-cash support provided by the platform
   - examples: energy drinks, shuttlecocks, desk timer
   - may exist even when there is no user payment or reimbursement flow

3. Subsidy settlement
   - reimbursement ratio
   - subsidy cap
   - settlement mode
   - user-to-platform prepayment offset when the platform must prepay booking-related costs

This suggests the old term “payment model” is no longer the right aggregate root. It collapses booking mode, who prepays, and who is ultimately subsidized into one enum, which is exactly what the user wants to undo.

## 4. Architectural Pressure and Trade-offs

### 4.1 Strong recommendation: move booking/resource out of `anchor_partner_requests`

Reason:

- `anchor_partner_requests` should primarily express Anchor subtype identity and lifecycle linkage.
- booking/resource support is an operational domain with its own fields and likely future records.
- keeping everything in the subtype row would preserve the current semantic coupling and make the refactor mostly cosmetic.

### 4.2 Do not model non-cash support as fake subsidy money

Reason:

- drinks/shuttlecocks/timers are not equivalent to “RMB subsidy”.
- forcing them into monetary fields would hurt readability and future reporting.
- the user explicitly requested “money之外的资助”.

So “resource support” needs explicit representation, not a text blob hanging off subsidy copy.

### 4.3 Keep booking separate from purchase/order state

Reason:

- booking answers “what must be reserved and by when”.
- purchase/payment answers “who prepays, who pays later, and how settlement is offset”.
- the user explicitly said reservation and purchase are different things.

If we merge them again in L1, the refactor will recreate the same problem under new names.

### 4.4 Route/API rename has a real maintainability trade-off

Option A: keep compatibility path `/apr/:id/economy` and rename UI only

- lower migration cost
- less code churn
- but permanently keeps wrong ubiquitous language in routes, query keys, types, and controller names

Option B: rename route/API/page to booking-subsidy semantics now

- more churn now
- but improves readability and makes future code easier to reason about

This is the clearest maintainability trade-off that should be decided before L1.

## 5. External Reference Notes

I did a brief external terminology check. The strongest relevant pattern is that payment systems commonly separate “authorization/hold” from “capture/settlement”, which supports keeping booking/prepayment and final subsidy settlement as distinct steps rather than one enum-driven “payment model”. This is analogous support only; the real design should still be driven by this repo’s product needs.

Reference:

- Stripe docs search: <https://docs.stripe.com/search?q=authorize%20capture>

## 6. Impacted Areas Identified in Code

Backend:

- `apps/backend/src/entities/anchor-event.ts`
- `apps/backend/src/entities/anchor-event-batch.ts`
- `apps/backend/src/entities/anchor-partner-request.ts`
- `apps/backend/src/entities/partner.ts`
- `apps/backend/src/domains/pr-core/services/economic-policy.service.ts`
- `apps/backend/src/domains/pr-core/temporal-refresh.ts`
- `apps/backend/src/domains/pr-core/use-cases/exit-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/get-reimbursement-status.ts`
- `apps/backend/src/domains/anchor-event/use-cases/expand-full-anchor-pr.ts`
- `apps/backend/src/domains/pr-core/use-cases/accept-alternative-batch.ts`
- `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr.ts`
- `apps/backend/src/domains/pr-anchor/use-cases/get-anchor-pr-economy.ts`
- `apps/backend/src/controllers/anchor-pr.controller.ts`

Frontend:

- `apps/frontend/src/router/index.ts`
- `apps/frontend/src/entities/pr/routes.ts`
- `apps/frontend/src/queries/useAnchorPR.ts`
- `apps/frontend/src/pages/AnchorPRPage.vue`
- `apps/frontend/src/pages/AnchorPREconomyPage.vue`
- `apps/frontend/src/locales/zh-CN.jsonc`

Documentation that will need updating later if implementation proceeds:

- `docs/product/overview.md`
- `docs/product/glossary.md`

## 7. L0 Conclusions

1. The requested refactor is not a copy-only rename. It requires a real domain reshaping.
2. The current old-model center is `paymentModelApplied`, and that coupling reaches storage, read models, frontend copy, and reimbursement rules.
3. The cleanest path is likely:
   - keep Anchor PR subtype for scenario identity and event/batch linkage;
   - extract booking/resource support into a dedicated domain table;
   - redefine subsidy policy around settlement timing, subsidy ratio, cap, and prepayment offset;
   - redesign the read model and UI around “booking + support + subsidy” instead of “economy + model A/C”.
4. The main pre-L1 decision is whether this refactor should also rename route/API surface now or keep compatibility naming temporarily.

## 8. Approval Gate for L1

Before I draft L1, I need confirmation on this trade-off:

- Do you want semantic renames now as part of this refactor, for example replacing `/apr/:id/economy` and related “economy” API/type names with a “booking-subsidy” style surface?
- Or should I preserve existing route/API names for compatibility and only rename the page/UI/domain terminology internally?
