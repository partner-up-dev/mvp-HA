# Task Packet - Issue 179 Join Gates

## Objective & Hypothesis

Objective: implement configurable join gates for `PR` join flows, including join notice agreement and booking contact collection, while keeping gate configuration separate from gate resolution facts.

Hypothesis: materializing event-level and booking-resource-level gate templates into `partner_requests.join_gate_config` at PR creation time gives each PR a stable runtime gate snapshot, while resolving each gate through its own owner facts keeps the join command simple and avoids a God-style preflight protocol.

## Input Classification

- Input Type: `Intent`
- Active Mode: `Execute`
- Durable Owner:
  - Product behavior: `docs/10-prd/behavior/*`
  - Cross-unit contract: `docs/20-product-tdd/cross-unit-contracts.md`
  - Runtime implementation: backend `PR` partner admission, `pr-booking-support`, admin PR/event/resource configuration, and frontend PR join modal.

## Confirmed Product Decisions

- Booking contact is a first-class join gate, not an implicit consequence of platform booking or booking-required flags.
- Booking contact gate configuration is contributed by booking-resource configuration and materialized into `partner_requests.join_gate_config` during PR creation.
- `bookingRequired` and `bookingHandledBy` do not decide whether booking contact is collected during join.
- PR-level join gate configuration is the runtime source of gate definitions.
- Event-level and resource-level join gate configs are templates. They are materialized into `partner_requests.join_gate_config` when a PR is created.
- Admin PR tooling may directly edit PR-level join gates after creation.
- `partner_requests.join_gate_config` is pure configuration. It does not store resolved state or resolved payload.
- Gate resolution is derived from gate-specific facts:
  - `BOOKING_CONTACT` resolution is derived from `pr_booking_contacts`.
  - `JOIN_NOTICE` resolution is derived from a dedicated notice acceptance table.
- `JOIN_NOTICE` is viewer-scoped. Each viewer must accept the active gate key and version before joining.
- `FALLBACK_CONFIRM` is system-generated only when `partner_requests.join_gate_config` contains no custom gates.
- `FALLBACK_CONFIRM` does not need persistent resolution.
- Join command payload stays light. It should not carry gate completions.

## Target Runtime Model

```text
Anchor Event join_gate_config template
Booking Resource join_gate_config template
Admin PR join_gate_config edit
        |
        | materialize on PR create / explicit admin edit
        v
partner_requests.join_gate_config
        |
        | project with gate-specific resolution facts
        v
GET /api/pr/:prId/join-gates
        |
        | resolve individual gates before join
        v
POST /api/pr/:prId/join-gates/:gateKey/resolve
        |
        | join checks unresolved custom gates
        v
POST /api/pr/:prId/join
```

## Proposed Config Shape

```ts
type PRJoinGateConfig = Array<
  | {
      key: string;
      kind: "JOIN_NOTICE";
      version: string;
      title: string;
      body: string;
      source: "PR" | "ANCHOR_EVENT" | "PR_SUPPORT_RESOURCE";
    }
  | {
      key: string;
      kind: "BOOKING_CONTACT";
      version: string;
      title: string;
      prompt: string;
      source: "PR" | "PR_SUPPORT_RESOURCE";
    }
>;
```

Rules:

- `key + kind + version` identifies one concrete gate definition.
- Config must be stable enough for old PRs to keep their original join behavior.
- Config must not include `resolved`, phone numbers, user ids, or acceptance facts.

## Proposed Resolution Storage

### Booking Contact

Use existing `pr_booking_contacts`.

- A `BOOKING_CONTACT` gate is resolved when the PR has a valid `pr_booking_contacts` row for the configured gate context.
- Resolve endpoint accepts a phone number, normalizes it, and writes `pr_booking_contacts`.
- Phone payload stays out of `partner_requests.join_gate_config`.

### Join Notice

Add a dedicated acceptance table.

```text
pr_join_notice_acceptances
- pr_id
- user_id
- gate_key
- gate_version
- accepted_at
- unique(pr_id, user_id, gate_key, gate_version)
```

Notes:

- This table is preferred over storing notice acceptance on `Partner`, because notice acceptance happens before partner slot creation.
- This table is preferred over PR-scoped resolved state, because notice acceptance is viewer-scoped.
- Resolve endpoint must ensure a local/authenticated user exists before recording acceptance.

## Proposed API Contract

### Read Join Gates

```http
GET /api/pr/:prId/join-gates
```

Response projection:

```ts
type PRJoinGateProjection = {
  gates: Array<
    | {
        key: string;
        kind: "JOIN_NOTICE";
        version: string;
        title: string;
        body: string;
        resolved: boolean;
      }
    | {
        key: string;
        kind: "BOOKING_CONTACT";
        version: string;
        title: string;
        prompt: string;
        resolved: boolean;
      }
    | {
        key: "system:fallback-confirm";
        kind: "FALLBACK_CONFIRM";
        version: "1";
        title: string;
        prompt: string;
        resolved: false;
      }
  >;
};
```

Projection rules:

- Read `partner_requests.join_gate_config`.
- If config is empty, return exactly one `FALLBACK_CONFIRM` gate.
- For `BOOKING_CONTACT`, compute `resolved` from `pr_booking_contacts`.
- For `JOIN_NOTICE`, compute `resolved` from `pr_join_notice_acceptances` for the current viewer user id.

### Resolve One Gate

```http
POST /api/pr/:prId/join-gates/:gateKey/resolve
```

Expected payloads:

```ts
type ResolveJoinGatePayload =
  | { kind: "JOIN_NOTICE"; version: string; accepted: true }
  | { kind: "BOOKING_CONTACT"; version: string; phone: string };
```

Rules:

- Resolve endpoint validates the gate key exists in `partner_requests.join_gate_config`.
- `JOIN_NOTICE` writes `pr_join_notice_acceptances`.
- `BOOKING_CONTACT` writes `pr_booking_contacts`.
- `FALLBACK_CONFIRM` is not resolved through this endpoint.

### Join Command

```http
POST /api/pr/:prId/join
```

Rules:

- Join payload does not carry gate completions.
- Join command recomputes gate resolution from current facts.
- If any custom gate remains unresolved, return Problem Details with stable code `PR_JOIN_GATE_UNRESOLVED`.
- Frontend responds to `PR_JOIN_GATE_UNRESOLVED` by refreshing `GET /api/pr/:prId/join-gates` and showing unresolved gates.

Problem shape target:

```json
{
  "type": "https://partner-up.app/problems/pr.join_gate.unresolved",
  "title": "请先完成加入前置项",
  "status": 400,
  "detail": "加入前需要先完成加入须知或联系人信息。",
  "code": "PR_JOIN_GATE_UNRESOLVED"
}
```

## UI Integration Target

- Frontend adds a PR-domain join gate modal.
- Frontend owns join execution through a reusable PR-domain `PRJoinFlow` component; calling surfaces provide their own button controls through slots.
- PR detail join action opens the join gate flow before attempting `POST /join` when unresolved gates are visible.
- Form Mode matched and no-match candidate join actions use the same flow instead of routing around gate handling.
- If `POST /join` returns `PR_JOIN_GATE_UNRESOLVED`, frontend refreshes join gates and resumes the same modal.
- Every gate has one view inside the modal:
  - `FALLBACK_CONFIRM`: simple confirmation view.
  - `JOIN_NOTICE`: agreement view with explicit cancel/agree buttons.
  - `BOOKING_CONTACT`: phone collection view.
- Successful join still triggers the existing join-success notification subscription and official-account follow prompts.

## Guardrails Touched

- PR join and partner admission semantics.
- Booking contact behavior and `pr-booking-support` boundaries.
- Anchor Event and booking-resource configuration materialization into PR-owned runtime config.
- Backend/frontend HTTP contract for join-gates.
- Problem Details code registry for unresolved join gates.
- Frontend PR join modal and WeChat pending-action replay.

## Implementation Slices

1. Durable docs and task packet
   - Update PRD join workflow and invariants.
   - Update Product TDD route/API contract with `GET /join-gates` and gate resolution endpoint.
2. Schema and entities
   - Add `partner_requests.join_gate_config`.
   - Add template config fields to Anchor Event and booking/support resource owners as needed.
   - Add `pr_join_notice_acceptances`.
3. Backend domain
   - Define join gate config schema and projection service.
   - Materialize Event and Resource templates into PR creation outputs.
   - Add `GET /api/pr/:prId/join-gates`.
   - Add `POST /api/pr/:prId/join-gates/:gateKey/resolve`.
   - Update `joinPRAsUser` to reject unresolved custom gates through `PR_JOIN_GATE_UNRESOLVED`.
4. Admin UX
   - Add PR-level join gate editing in Admin PR.
   - Add Event and booking-resource template configuration where needed.
5. Frontend PR UX
   - Add `usePRJoinGates`.
   - Add `PRJoinGateModal`.
   - Add slot-based `PRJoinFlow`.
   - Replace page-local join summary/phone steps with gate views.
   - Reuse `PRJoinFlow` from PR detail, Form Mode matched handoff, and Form Mode no-match candidate actions.
6. Verification
   - Backend scenario tests for notice acceptance, booking contact resolution, unresolved join rejection, and platform booking decoupling.
   - Frontend build and manual join flow verification.

## Verification Plan

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend build`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm --filter @partner-up-dev/backend test:scenario`
- `pnpm --filter @partner-up-dev/frontend build`
- Manual flows:
  - no custom gate shows fallback confirmation
  - join notice requires each viewer acceptance
  - booking contact gate collects phone independently from booking handled-by mode
  - custom gates suppress fallback confirmation
  - join command rejects unresolved custom gates with `PR_JOIN_GATE_UNRESOLVED`

## Implementation Decisions

- Admin PR owns direct PR-level gate edits.
- Admin Anchor Event owns Event template `JOIN_NOTICE` edits.
- Admin Booking Support owns resource template gates, including `BOOKING_CONTACT`.
- Existing booking support page remains the post-join phone update surface.
- Materialization deduplicates by `kind + source + key` and lets later templates with the same identity overwrite earlier ones.

## Execution Log

- 2026-05-02: Human confirmed the final model and asked to start implementation.
- 2026-05-02: Added join gate schema, database migration, join notice acceptance table, projection/resolve service, join rejection through Problem Details code `PR_JOIN_GATE_UNRESOLVED`, PR creation materialization, Admin API fields, frontend join-gate query/modal, and Admin editors for PR/Event/Resource gate config.
- 2026-05-02: Added scenario coverage for unresolved notice/booking-contact gates and their resolve-before-join paths.
- 2026-05-02: Extracted slot-based `PRJoinFlow` and wired PR detail, Form Mode matched handoff, and Form Mode no-match candidate join buttons through the shared join-gate flow.
- 2026-05-02: Verification run:
  - `pnpm --filter @partner-up-dev/backend typecheck` passed.
  - `pnpm --filter @partner-up-dev/backend build` passed.
  - `pnpm --filter @partner-up-dev/frontend build` passed.
  - `pnpm --filter @partner-up-dev/backend db:lint` passed.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` completed and reported an existing unrelated finding in `src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue`.
  - `pnpm --filter @partner-up-dev/backend test:scenario` passed after loading `apps/backend/.env` into the test process environment.
- 2026-05-02: Additional frontend integration verification:
  - `pnpm --filter @partner-up-dev/frontend build` passed after extracting `PRJoinFlow`.
  - `pnpm --filter @partner-up-dev/backend typecheck` passed.
  - `pnpm test:backend:scenario` passed through the workspace env-loading wrapper.
  - `pnpm --filter @partner-up-dev/frontend lint:tokens` completed with the same existing unrelated finding in `src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue`.
