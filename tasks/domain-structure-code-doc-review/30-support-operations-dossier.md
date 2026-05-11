# Support And Operations Dossier

## 1. What It Is, And What It Is Not

Support And Operations is currently an overloaded coordination boundary that covers user-facing help routes, author feedback, about/build metadata, event beta-group entrypoints, operator maintenance, and configuration that changes user-visible flow.

It is:

- the fallback path when users need help outside the main collaboration flow
- the route family for support, author contact, about metadata, official account QR, and event beta groups
- the operator tooling surface for maintaining event, POI, booking support, PR messages, booking execution, and config
- the recognition that operator-managed configuration can materially change product behavior

It is not:

- Booking Support
- the notification system
- a single aggregate
- a single business object named `Admin`
- generic layout chrome such as footers unless they carry support semantics

Current smell: this boundary contains at least three contexts:

- Customer Support: user-facing support and author feedback routes.
- Activity Coordination: event-specific beta-group entrypoints.
- Operator Operations: admin tooling, configuration, execution, and maintenance.

## 2. Why It Exists

It exists because the MVP still needs human and operational seams.

The product cannot rely only on the happy-path collaboration flow. It needs:

- users to find help, author feedback, and product/about metadata
- event participants to find event-specific beta groups for coordination or requests
- operators to maintain Anchor Event, POI, Booking Support, PR visibility/status/content, system messages, and booking execution
- runtime configuration to alter user-visible behavior without code changes

The responsibility is service continuity, not core collaboration modeling.

## 3. Lifecycle

Customer support route lifecycle:

1. User enters `/contact-support` from home, footer, PR, or support entrypoints.
2. The page resolves configured support/staff links.
3. Browser environment decides direct outbound link versus QR modal fallback.
4. User may continue to author feedback or about page.

Activity beta-group lifecycle:

1. Operator configures event-specific beta-group QR on Anchor Event.
2. Public event catalog/detail exposes the QR value.
3. `/about` and `/events/:eventId` expose event-owned beta-group entry.
4. User opens event-specific group QR for activity coordination or support.

Operator operations lifecycle:

1. Operator authenticates through admin session.
2. Operator enters a task workspace.
3. Operator mutates event/POI/booking support/PR/message/execution/config state.
4. Backend persists authoritative state and operation logs when relevant.
5. User-facing flows reflect the changed state.

## 4. Inputs And Outputs

Inputs:

- public config values for WeCom/support/staff links
- active Anchor Events and event-specific beta-group QR codes
- browser environment and mini-program webview capability
- admin credentials/session
- operator commands
- build metadata

Outputs:

- support route UI and QR fallback
- author/about navigation
- official-account QR modal
- event beta-group QR modal
- admin workspace payloads
- backend mutations for event, POI, booking support, PR state/content/messages, booking execution, config
- operation logs and user-visible state changes

## 5. External Conditions

Important external conditions:

- WeCom link availability
- mini-program webview restrictions
- backend public config availability
- event-specific beta-group QR configuration
- admin authentication state
- operator availability and correctness
- build metadata availability

This boundary is operationally complex because it combines product assistance, human operation, and browser/platform limitations.

## 6. Invariants

Hard invariants already implied by docs:

- The "Need Help" path must keep support, author feedback, and about-page routing distinct.
- Event-specific beta groups are Anchor Event fields, not generic public config values.
- Event beta groups may help support and coordination, but they do not replace backend-owned PR messaging visibility and participant rules.
- Admin and user sessions are separate client contexts.
- Operator-managed configuration counts as product behavior when it changes user-visible flow.
- Frontend must not recreate backend domain rules as local support/admin policy.

Likely invariants to clarify:

- Customer Support should not own Booking Support execution semantics.
- Admin pages should be treated as operator command/read-model surfaces over other domains, not as the semantic owners of those domains.

## 7. How It Is Observed And Changed

Customer Support is observed through:

- `/contact-support`
- `/contact-author`
- `/about`
- support footer/entry links
- official account QR modal

Activity Coordination is observed through:

- Anchor Event beta group cards
- `/about#beta-groups`
- active Anchor Event catalog/detail responses

Operator Operations are changed through:

- admin anchor PR management
- admin anchor PR messages
- admin booking support configuration
- admin booking execution
- admin POI management
- config endpoints and repositories

Operator effects are observed through:

- changed public event/PR/support payloads
- operation logs
- admin workspaces and audit views
- user-visible behavior changes

## 8. Boundaries With Other Concepts

With `Booking Support`:

- Support routes may direct a user to help.
- Booking Support owns resource/contact/execution semantics.

With `Anchor Event`:

- Event owns event-specific beta-group QR codes.
- Support pages may display those event-owned entrypoints.

With `PartnerRequest`:

- Admin tooling may mutate PR content/status/visibility or add system messages.
- PR remains the owner of collaboration lifecycle and message visibility.

With `Identity And Session`:

- Admin session and user session are separate.
- Support browsing should not impose identity gates unless a downstream action requires it.

With `Configuration`:

- Config is operational state, but it becomes product-relevant when it changes user-visible routes or support links.

## Evidence

- Derived boundary currently combines support and operations: `docs/10-prd/domain-structure/derived-boundaries.md`.
- PRD workflow combines support, feedback, and operator support: `docs/10-prd/behavior/workflows.md`.
- PRD profile/support rules keep Need Help, author feedback, and about distinct: `docs/10-prd/behavior/rules-and-invariants.md`.
- Product TDD marks admin-managed configuration and event beta-group QR codes as backend-authoritative: `docs/20-product-tdd/system-state-and-authority.md`.
- Frontend support route: `apps/frontend/src/pages/ContactSupportPage.vue`.
- Frontend about/beta-group route: `apps/frontend/src/pages/AboutPage.vue`.
- Frontend support domain is currently mostly UI fragments: `apps/frontend/src/domains/support/ui/sections`.
- Backend admin route families: `apps/backend/src/controllers/admin-anchor-management.controller.ts`, `apps/backend/src/controllers/admin-booking-support.controller.ts`, `apps/backend/src/controllers/admin-booking-execution.controller.ts`, `apps/backend/src/controllers/admin-poi.controller.ts`.

## Open Questions

- Should `Support And Operations` stay one derived boundary, or be split into Customer Support, Activity Coordination, and Operator Operations?
- Should frontend `domains/support` remain a small surface domain, or should support routing/use cases move out of page files?
- Should admin pages be documented as operator surfaces over other domains rather than their own business domain?
- Where should public config that changes user-visible support behavior be documented: Product TDD config contract, Deployment, or a Support/Operations dossier?

## Promotion Candidates

Potential durable truths to promote later:

- `Admin` is an actor/tooling context, not a core domain object.
- Customer Support and Booking Support must remain separate concepts.
- Event beta-group QR ownership belongs to Anchor Event.
- Operator-managed configuration that changes user flow is product behavior.
