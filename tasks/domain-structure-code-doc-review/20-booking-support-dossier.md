# Booking Support Dossier

## 1. What It Is, And What It Is Not

Booking Support is the user-visible support surface for booking-related help, subsidy-related help, and platform-handled booking context inside Anchor PR flows.

It is:

- a business capability attached to event-anchored collaboration
- the owner of support resources, booking responsibility, booking contact semantics, and booking execution visibility
- a bridge from Anchor Event / Batch templates to per-Anchor-PR executable support state
- an operator-facing fulfillment and audit surface when the platform must act

It is not:

- generic customer support
- the `/contact-support` route
- an admin domain by itself
- a generic "resource support" domain detached from Anchor Event / Anchor PR
- a payment, ticketing, or reservation engine

Term cleanup:

- `Booking Support` is the business capability.
- `Support Resource` is a configured or materialized item inside Booking Support.
- `Booking Contact` is the phone-contact semantic required only for `PLATFORM_PASSTHROUGH`.
- `ResourceSupport` is not currently a stable glossary term.

## 2. Why It Exists

It exists because Anchor PR collaboration can require real-world execution beyond "people joined".

The system needs to support:

- explaining booking or subsidy rules to users
- carrying booking responsibility semantics
- collecting a booking contact only when required
- admitting eligible PRs into an operator pending workspace
- recording auditable operator execution results
- notifying active participants about fulfillment outcomes

The responsibility is: make event-anchored collaboration executable when booking/subsidy/platform handling matters.

## 3. Lifecycle

Booking Support has a template-to-execution lifecycle:

1. Operators configure event-level support resources.
2. Operators may configure batch-level overrides.
3. When an Anchor PR is created or materialized, the system resolves templates into PR-level support resources.
4. Users read the PR-level booking support preview/detail.
5. If any required resource is `PLATFORM_PASSTHROUGH`, the first active booking-contact owner must provide a valid phone.
6. PR lifecycle and booking deadlines determine whether booking support is pending, locked, or fulfilled.
7. When an Anchor PR reaches booking-execution eligibility, it appears in the admin booking execution workspace.
8. An operator submits a success or failure result for a target resource.
9. The system records the execution result and notification summary.
10. Current active participants are notified when conditions are met.
11. If a booking contact is invalid, an operator may release the contact/participant and that release is audit-relevant.

## 4. Inputs And Outputs

Inputs:

- Anchor Event support resource configuration
- Anchor Event Batch support overrides
- Anchor PR root fields: status, time window, location, min partners
- active participant count
- booking handled-by semantics: `PLATFORM`, `PLATFORM_PASSTHROUGH`, `USER`
- booking contact phone input
- operator execution result and failure reason
- notification transport availability

Outputs:

- materialized Anchor PR support resources
- booking support preview/detail payloads
- booking contact state
- admin pending workspace items
- booking execution records
- operation logs for execution and manual release
- booking result notification summary

## 5. External Conditions

Important external conditions:

- operator-managed configuration quality
- phone validation and reachable contact data
- time windows and booking deadlines
- current active participant count compared with `minPartners`
- WeChat notification availability for fulfillment result delivery
- admin session and operator availability
- forward-only data/migration constraints for support resource schema changes

Much of the complexity is operational coupling: the domain itself is "who handles booking and what support applies", but runtime reality includes operators, deadlines, phone contact, and notifications.

## 6. Invariants

Hard invariants:

- Only `PLATFORM_PASSTHROUGH` booking requires booking-contact phone input.
- Standard `PLATFORM` booking must not require user phone input.
- User-facing Booking Support reads PR-level materialized resources, not raw mutable templates.
- Platform-handled booking execution pending status is limited to `READY`, `FULL`, and `LOCKED_TO_START`.
- Pending workspace eligibility requires minimum active participants, not confirmed-participant count.
- Operator execution results must be auditable.
- Booking result notifications should target current active participants, not only the booking-contact owner.
- Manual operator release of an invalid booking contact belongs to the audit semantics of that release.

Likely invariants to clarify:

- When materialized PR-level support resources may drift from event/batch templates after later operator edits.
- Whether booking support resource resolution belongs to `anchor-event` or `pr-booking-support` at the code boundary.

## 7. How It Is Observed And Changed

Changed by:

- admin event support resource replacement
- admin batch support override replacement
- Anchor PR creation/materialization
- user join with booking-contact phone when required
- user booking-contact phone update
- admin booking execution submission
- admin manual release of invalid booking contact

Observed through:

- Anchor PR booking support detail route
- Anchor PR detail view model where booking contact affects join flow
- admin booking support configuration workspace
- admin booking execution pending/audit workspace
- operation logs
- booking execution records
- booking result notification summaries

## 8. Boundaries With Other Concepts

With `Anchor Event`:

- Anchor Event owns event/batch context and support resource templates.
- Booking Support owns how templates become executable support semantics.

With `PartnerRequest / Anchor PR`:

- PR owns status, time, location, participants, and lifecycle.
- Booking Support consumes PR facts to determine support detail, contact requirement, and execution eligibility.

With `Notification`:

- Booking Support creates booking-result notification opportunities.
- Notification owns delivery policy, quota, transport, and delivery records.

With `Admin / Operations`:

- Admin tooling changes and executes Booking Support.
- Admin is an actor/tooling surface, not the semantic owner of Booking Support itself.

With `Customer Support`:

- Customer support routes can explain or direct users.
- They do not own booking responsibility, resources, contact, or execution records.

## Evidence

- Glossary canonical term: `docs/10-prd/glossary.md`.
- PRD capabilities mention booking support and resource-support semantics: `docs/10-prd/behavior/capabilities.md`.
- Product TDD marks support resources, booking contacts, and booking execution records as backend-authoritative state: `docs/20-product-tdd/system-state-and-authority.md`.
- Admin Booking Execution contract: `docs/20-product-tdd/cross-unit-contracts.md`.
- User-facing detail use case: `apps/backend/src/domains/pr-booking-support/use-cases/get-anchor-pr-booking-support.ts`.
- Booking handling rules: `apps/backend/src/domains/pr-booking-support/services/booking-handling.service.ts`.
- Support template resolution: `apps/backend/src/domains/pr-booking-support/services/resolve-support-resource-templates.ts`.
- Admin execution workspace: `apps/backend/src/domains/admin-booking-execution/use-cases/get-admin-booking-execution-workspace.ts`.
- Execution submission: `apps/backend/src/domains/admin-booking-execution/use-cases/submit-admin-anchor-pr-booking-execution.ts`.

## Open Questions

- Should frontend create a first-class `domains/booking-support` boundary, or keep user-facing booking support under `pr` and operator tooling under `admin`?
- Should backend rename or document `pr-booking-support` as the semantic owner of Booking Support despite event template dependencies?
- Should support resource materialization and drift rules be promoted to Product TDD?
- Should admin booking execution be documented as a read-model/workspace assembler rather than an ordinary use case?

## Promotion Candidates

Potential durable truths to promote later:

- `Booking Support` is not customer support.
- `Support Resource` is a sub-concept of Booking Support.
- Booking execution eligibility and contact rules are hard domain invariants.
- Admin execution is an operator workflow over Booking Support, not a separate business domain.
