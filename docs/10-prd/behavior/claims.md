# Product Claims

## Claim 1. A One-Sentence Intent Can Become a Joinable Collaboration Object

- Claim Intent: let a user freeze a natural-language collaboration intent into a stable `PartnerRequest` that other people can understand, join, and revisit.
- Evaluation Dimensions:
  - creation friction stays low
  - the created object remains stable enough to share
  - a recipient can understand what action to take
- Evidence Expectation:
  - users can create a `Community PR` from lightweight input
  - shared routes remain legible and actionable on revisit
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/business-and-service-objectives.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`

## Claim 2. Community and Anchor Collaboration Must Evolve by Scenario, Not by Forced Page Unification

- Claim Intent: preserve shared collaboration semantics without forcing `Community PR` and `Anchor PR` into one page grammar.
- Evaluation Dimensions:
  - scenario-specific fields and actions can diverge
  - shared semantics such as participation and timing remain legible
  - event-anchored collaboration can add stronger reliability and booking semantics
- Evidence Expectation:
  - route families and workflows remain clearly distinct
  - `Anchor PR` can support confirmation, check-in, and booking-related flows without collapsing into the `Community PR` surface
- Source Rationale:
  - `../_drivers/business-and-service-objectives.md`
  - `../_drivers/hard-constraints.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`

## Claim 3. Collaboration Must Support Distribution, Revisit, and Re-Entry

- Claim Intent: treat `PartnerRequest` as a reusable collaboration object rather than a disposable form submission.
- Evaluation Dimensions:
  - link sharing remains a first-class path
  - revisit and re-entry remain available through home, event, history, and shared routes
  - attribution can flow through the revisit path
- Evidence Expectation:
  - public detail routes remain stable
  - share outputs continue to route new visitors back into collaboration
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/hard-constraints.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`

## Claim 4. Collaboration Needs a Minimum Trust Loop

- Claim Intent: help users judge whether collaboration is still credible, not just whether it was created.
- Evaluation Dimensions:
  - formed and full states remain clear
  - confirmation and check-in loops reinforce reliability in `Anchor PR`
  - notification semantics model real send opportunities rather than a generic toggle
- Evidence Expectation:
  - `Anchor PR` exposes confirmation, reminder, and check-in behavior
  - fulfillment-related notifications and reliability feedback remain user-visible where relevant
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/operational-realities.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/system-state-and-authority.md`

## Claim 5. Identity Should Support Collaboration Instead of Blocking It Up Front

- Claim Intent: let collaboration start lightly and strengthen identity only when the scenario requires more trust.
- Evaluation Dimensions:
  - anonymous browsing is allowed
  - local account plus PIN can support lightweight ownership and revisit
  - stronger identity requirements appear only in stronger-trust scenarios
- Evidence Expectation:
  - `Community PR` remains compatible with local account plus PIN
  - key `Anchor PR` actions remain gated by authenticated session plus WeChat binding
- Source Rationale:
  - `../_drivers/market-and-user-pressures.md`
  - `../_drivers/hard-constraints.md`
- Realization Pointers:
  - `../../20-product-tdd/claim-realization-matrix.md`
  - `../../20-product-tdd/cross-unit-contracts.md`
