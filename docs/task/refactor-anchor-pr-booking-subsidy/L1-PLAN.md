# L1 Plan: High-Level Strategy for Anchor PR Booking / Support Refactor

## 1. Strategy Summary

Refactor Anchor PR from the old `economy + Model A/C` design into a new `booking-support` design with these principles:

1. Treat resource as the primary object.
2. Treat booking as a capability/state attached to a resource, not as a separate unrelated concept.
3. Treat subsidy as one kind of support, alongside non-cash support such as drinks, shuttlecocks, or study tools.
4. Rename route/API/page/domain terminology now, with no compatibility layer.
5. Make user-facing presentation copy-first and scenario-first, while keeping structured rules underneath for lifecycle and settlement logic.

## 2. Ubiquitous Language

### Replace

- `economy`
- `payment model`
- `Model A`
- `Model C`

### With

- `booking support`
- `resource`
- `booking`
- `support policy`
- `subsidy settlement`

### Recommended naming

Technical route/API/domain naming:

- `booking-support`

Reason:

- the page must cover booking, subsidy, and non-cash support;
- `booking-subsidy` still under-represents physical resources;
- `support` is broad enough to include both money and goods.

User-facing page naming:

- `预订与资助`

Reason:

- `资助` can naturally include “场地费用全包” and “赠送羽毛球和饮品”;
- it reads better than forcing all user copy into “补贴”;
- detailed sections can still explicitly use “补贴规则” where needed.

## 3. Domain Architecture

### 3.1 Keep Anchor PR subtype focused

Keep `anchor_partner_requests` responsible for:

- Anchor Event linkage
- batch linkage
- visibility
- anchor-only lifecycle identity

Remove booking/support semantics from this subtype table over time.

### 3.2 Introduce a dedicated booking-support domain

Create a new Anchor-only domain, tentatively:

- `domains/pr-booking-support`

This domain owns:

- resource definitions attached to an Anchor PR
- booking-related rules for those resources
- subsidy/support settlement policy
- user-facing booking/support read models

### 3.3 Resource is the base entity

Each Anchor PR can have zero-to-many support resources, for example:

- court
- shuttlecock
- energy drink
- desk timer

Each resource may independently declare whether it:

- needs booking
- needs advance payment
- is platform-provided for free
- participates in subsidy settlement

This is the key shift from the old single-policy snapshot model.

## 4. Policy Model Direction

### 4.1 Replace Model A / C with settlement timing

Internal monetary support should move from `A | C` to a settlement-oriented model:

- `PLATFORM_PREPAID`
- `PLATFORM_POSTPAID`

Meaning:

- `PLATFORM_PREPAID`: the platform needs to pay first to secure a booking/resource; user may need to transfer money to the platform first, and that transfer offsets later subsidy settlement.
- `PLATFORM_POSTPAID`: user pays the actual activity cost first, and the platform settles reimbursement later.

This matches the user’s requested mental model and removes the misleading “full vs partial subsidy” framing.

### 4.2 Keep subsidy math structured, but not primary in UI

Structured policy still needs:

- subsidy ratio
- subsidy cap
- settlement timing

But the UI should not lead with raw math like:

- `补贴上限 10 元`
- `补贴比率 100%`

Instead, the primary surface should be scenario text such as:

- `场地费用全包，另外赠送羽毛球和饮品`

Raw rule values should remain available as secondary explanatory details for edge cases and operational correctness.

### 4.3 Non-cash support is first-class

Non-cash support must be represented structurally, not as a free-text note attached to a money policy.

Reason:

- it is product-visible;
- it changes user expectation;
- it should be queryable and renderable consistently.

## 5. Read Model Strategy

### 5.1 Replace the old economy page with a booking-support page

Rename:

- frontend route
- backend route
- page component
- query keys
- inferred types
- controller/use-case names

Recommended target:

- page route: `/apr/:id/booking-support`
- API route: `GET /api/apr/:id/booking-support`

### 5.2 User-facing page should be layered

The new page should expose three layers:

1. Summary layer
   - concise promise-oriented copy
   - example: `场地费用全包，另外赠送羽毛球和饮品`

2. Structured support layer
   - which resources are included
   - which resource requires booking
   - whether the platform books for the user
   - whether the user needs to prepay the platform

3. Rules layer
   - booking deadline
   - cancellation rule
   - subsidy ratio/cap
   - reimbursement/prepayment explanation

This allows the app to stay understandable without losing operational clarity.

### 5.3 PR detail page should show a support preview, not legacy model labels

Replace current detail-card summary:

- no more `Model A / Model C`

With:

- short summary sentence
- booking deadline summary when relevant
- optional resource highlights

## 6. Lifecycle and Behavioral Rules

The existing booking-driven lifecycle must remain valid after the refactor:

- booking deadline may lock the PR to `LOCKED_TO_START`
- booking deadline may auto-release unconfirmed slots
- confirmed/attended slots remain non-exitable after booking deadline

So the new booking-support domain must continue supplying a resolved booking deadline to the Anchor PR lifecycle layer.

This is a hard requirement. The refactor cannot reduce booking to a display-only concept.

## 7. Migration Strategy

Because there is no compatibility requirement, the strategy is:

1. introduce the new booking-support storage/domain;
2. migrate existing anchor snapshot data into the new model;
3. switch backend read models and lifecycle lookups to the new source;
4. rename route/API/frontend surfaces in one pass;
5. remove old economy naming and old A/C assumptions.

This is cleaner than keeping both vocabularies alive during MVP.

## 8. Dependencies and Scope

### In scope

- backend storage/domain refactor for booking/resource/support
- route/API rename from economy to booking-support semantics
- frontend page redesign for booking/support presentation
- PR detail entry-card rewrite
- reimbursement eligibility logic refactor away from `Model A`
- document updates

### Out of scope for this refactor

- full operational workflow for actually collecting money from users
- admin console for managing resource items
- generalized support domain for Community PR

The MVP should model and display the rules correctly without trying to solve the entire operations system now.

## 9. Key Decisions Locked for L2

1. No compatibility layer.
2. Booking is based on resource.
3. Non-cash support is first-class structured data.
4. Old `paymentModelApplied` is removed from the target design.
5. User-facing copy is generated from structured policy but should not expose raw ratio/cap as the primary summary.

## 10. Approval Gate for L2

If you approve this direction, I will move to L2 and specify:

- the exact table split
- the new enums and data structures
- the API response shapes
- the frontend page and component boundaries
- the migration shape from old snapshot fields to the new domain

One specific L1 recommendation to confirm:

- I recommend using `booking-support` as the technical route/API/domain term, and `预订与资助` as the main user-facing page title, because it covers booking + subsidy + physical resources without forcing everything into the word “补贴”.
