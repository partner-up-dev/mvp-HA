# Task Packet - Admin UI Refactor Exploration

## MVT Core

- Objective & Hypothesis: Map the current Admin frontend implementation topology, information architecture, code smells, and UX scaling pressure before a larger Admin UI refactor. Hypothesis: the refactor should pair boundary repair with an Admin-specific shell/layout system, because Admin feature growth is now constrained by both page-code density and navigation/layout capacity.
- Guardrails Touched:
  - typed input: `Intent` + `Constraint` + `Artifact`
  - active mode: `Explore` -> `Solidify`
  - frontend Admin route topology
  - frontend Admin domain query / use-case / UI ownership
  - Admin UX information architecture and navigation model
  - Admin page layout primitives and shared UI boundaries
  - existing Admin task packets as volatile implementation history
- Verification:
  - create this task packet before implementation work
  - inspect current Admin routes, pages, domain modules, and locale keys
  - list current Admin frontend topology with file anchors
  - list current Admin information architecture by user-facing surface
  - identify code smells and UX scaling problems with sub-agent review
  - solidify candidate AdminNavigationPanel and AdminPageScaffold contracts
  - leave refactor implementation for a later confirmed Execute slice

## Working Notes

- Durable Owner:
  - frontend route entrypoints under `apps/frontend/src/pages`
  - Admin domain modules under `apps/frontend/src/domains/admin`
  - app router wiring under `apps/frontend/src/app`
  - candidate Admin-only layout and navigation components under `apps/frontend/src/domains/admin/ui`
- Initial Constraint:
  - this slice records current state and high-level target architecture only; product-code mutation is deferred until explicit implementation confirmation.
- User-stated Target:
  - Admin refactor must address boundary decay and DRY violations.
  - Admin refactor must improve UX for a growing management surface.
  - Admin navigation should gain second-level menu support.
  - Admin navigation should follow business-object groups:
    - 活动管理
    - PR 管理
    - 支持资源
    - POIs 管理
    - 反馈问卷
  - Admin layout should use one shared `AdminPageScaffold` with two columns:
    - left operator column: global Admin navigation plus route-context modules shared across second-level views, such as Anchor Event selection, PR filters, POI selection, support-resource selectors, and feedback questionnaire template selection
    - right workspace: page header plus the active second-level business section content
  - Admin composables should be organized by Admin functional area folders instead of one flat bucket.
  - Admin feature sections should use a section orchestrator layer that owns BentoLayout, card allocation, and shared actions.
  - Admin business components should own business content and matching query/mutation hooks while staying free of card/container shell semantics.
  - Anchor Event should introduce finer use-cases or API surfaces for section-level business components.

## Packet Index

- Current topology map: `10-current-topology.md`
- Current information architecture: `20-current-information-architecture.md`
- Refactor smells and UX opportunities: `30-refactor-smells-and-ux-opportunities.md`
- Target component contracts: `40-target-admin-shell-contracts.md`
- Candidate execution slices: `50-candidate-execution-slices.md`
- Execute handshake for first slice: `60-execute-handshake.md`
- Slice 1 implementation notes: `70-slice-1-implementation.md`
- Component boundary decisions: `80-component-boundary-decisions.md`
- Slice 2 implementation notes: `90-slice-2-implementation.md`
- Slice 3 Anchor Event module implementation notes: `100-slice-3-anchor-event-modules-implementation.md`
- Slice 5 Admin page scaffold pilot: `120-slice-5-admin-page-scaffold-pilot.md`
- Next slices roadmap: `130-next-slices-roadmap.md`
- Slice 6 scaffold stabilization: `135-slice-6-admin-scaffold-stabilization.md`
- Slice 7 owner audit: `140-admin-query-mutation-owner-audit.md`
- Slices 8-11 implementation notes: `150-slices-8-11-implementation.md`
- Two-column Admin shell correction: `160-admin-two-column-shell-correction.md`
