# LLD - Action Preflight And Problem Details

## Objective

Define one reusable low-level contract for:

- PR action availability on read paths
- PR action failure on write paths
- frontend reuse across button state, CTA replacement, inline hint, and toast rendering

This LLD covers:

- `join`
- `confirm`
- `check_in`
- booking-contact related actions

## Core Decisions

1. `Attendance` stays inside the `Partner` submodule.
2. `GET /api/pr/:id/actions/preflight` is the canonical action-availability endpoint.
3. Command failures use RFC 9457 Problem Details with RFC 9110 status semantics.
4. Backend owns localized `title` and `detail`.
5. Backend and frontend share stable machine-readable `code`.
6. Frontend owns presentation policy: hide, disable, or replace CTA.
7. Action availability and problem-details transport live in a reusable cross-domain substrate rather than a PR-only abstraction.

## Abstraction Placement

The abstraction should split into two layers:

- reusable substrate
  - HTTP transport shape
  - problem-details shape
  - action-decision shape
  - frontend action-presentation adapter shape
- domain-owned registry
  - action names
  - fact loaders
  - denial codes
  - problem rendering inputs
  - surface-specific presentation mapping

Recommended code topology:

```text
shared/
  contracts/
    action-availability.ts
    problem-details.ts
  frontend/
    action-presentation.ts

domains/pr/
  model/
    partner/
      action-codes.ts
      action-deciders.ts
      problem-registry.ts
```

This keeps the protocol reusable across future domains such as booking-contact actions, notification-management actions, or support-resource actions.

## Domain Placement

`confirm`, `join-lock`, and `check-in` all speak about one partner slot and one viewer's participation lifecycle.

Recommended backend topology:

```text
domains/pr/
  model/
    pr/
    partner/
      admission/
        decide-join.ts
        decide-confirm.ts
      attendance/
        decide-check-in.ts
      problem-registry.ts
      action-codes.ts
```

`attendance/` is a namespace inside `partner/`, not a sibling module. Split it out later only when it gains independent persistence or independent command surfaces.

## Backend Contract

### 1. Reusable Substrate Types

```ts
export type PRActionName =
  | "join"
  | "confirm"
  | "check_in"
  | "booking_contact_claim"
  | "booking_contact_release";

export type PRActionProblemCode =
  | "pr.partner.join.auth_required"
  | "pr.partner.join.identity_binding_required"
  | "pr.partner.join.already_joined"
  | "pr.partner.join.not_joinable_status"
  | "pr.partner.join.full"
  | "pr.partner.join.join_locked"
  | "pr.partner.join.time_conflict"
  | "pr.partner.confirm.auth_required"
  | "pr.partner.confirm.identity_binding_required"
  | "pr.partner.confirm.not_joined"
  | "pr.partner.confirm.already_confirmed"
  | "pr.partner.confirm.outside_window"
  | "pr.partner.check_in.auth_required"
  | "pr.partner.check_in.identity_binding_required"
  | "pr.partner.check_in.not_joined"
  | "pr.partner.check_in.not_active"
  | "pr.partner.check_in.already_submitted"
  | "pr.booking.contact.not_required"
  | "pr.booking.contact.auth_required"
  | "pr.booking.contact.not_owner"
  | "pr.booking.contact.already_claimed";

export type LocalizedActionProblem = {
  type: string;
  code: PRActionProblemCode;
  title: string;
  detail: string;
};

export type ActionDecision =
  | {
      allowed: true;
      problem: null;
      nextRelevantAt: string | null;
    }
  | {
      allowed: false;
      problem: LocalizedActionProblem;
      nextRelevantAt: string | null;
    };
```

These transport-level shapes can be lifted into a cross-domain substrate by renaming the domain-specific aliases:

```ts
export type ActionName = string;
export type ActionProblemCode = string;

export type LocalizedProblem = {
  type: string;
  code: ActionProblemCode;
  title: string;
  detail: string;
};

export type ActionDecision =
  | { allowed: true; problem: null; nextRelevantAt: string | null }
  | { allowed: false; problem: LocalizedProblem; nextRelevantAt: string | null };
```

`PRActionName` and `PRActionProblemCode` then become PR-domain aliases that narrow the shared substrate types.

### 2. Domain Decider Shape

Each action gets one pure decider:

```ts
export interface ActionDecisionInput {
  now: Date;
  locale: string;
  viewer: ViewerFacts;
  pr: PRFacts;
  partner: PartnerFacts;
  booking: BookingFacts;
}

export type ActionDecider = (
  input: ActionDecisionInput,
) => ActionDecision;
```

Rules:

- deciders read durable facts only
- deciders do not access DB or HTTP context
- deciders emit one primary denial code
- deciders compute `nextRelevantAt` when time is the next re-evaluation trigger

### 3. Domain Problem Registry

Problem registry owns:

- `code -> type`
- `code + locale + facts -> title/detail`
- `code -> RFC 9110 status`

Shape:

```ts
type ProblemTemplate = {
  type: string;
  status: number;
  renderTitle: (locale: string, facts: ProblemFacts) => string;
  renderDetail: (locale: string, facts: ProblemFacts) => string;
};
```

Locale selection order:

1. explicit request locale
2. authenticated user locale when present
3. default product locale

Responses should set:

- `Content-Type: application/problem+json` on command failure
- `Content-Language: <resolved-locale>`

### 4. Preflight Endpoint

Route:

```http
GET /api/pr/:id/actions/preflight
```

Optional query:

```http
?actions=join,confirm,check_in
```

Default behavior:

- evaluate all actions relevant to the current PR detail surface

Response:

```json
{
  "evaluatedAt": "2026-04-22T12:00:00.000Z",
  "actions": {
    "join": {
      "allowed": true,
      "problem": null,
      "nextRelevantAt": "2026-04-22T12:30:00.000Z"
    },
    "confirm": {
      "allowed": false,
      "problem": {
        "type": "https://partnerup.app/problems/pr.partner.confirm.outside_window",
        "code": "pr.partner.confirm.outside_window",
        "title": "確認時間尚未開始",
        "detail": "此搭子的確認窗口將於今天 18:30 開啟。"
      },
      "nextRelevantAt": "2026-04-22T18:30:00.000Z"
    }
  }
}
```

Notes:

- preflight stays advisory
- command handlers stay authoritative
- preflight reuses the same deciders and the same registry
- `status` is omitted from preflight to keep the shape minimal

### 5. Command Failure

Example:

```json
{
  "type": "https://partnerup.app/problems/pr.partner.confirm.outside_window",
  "title": "確認時間尚未開始",
  "status": 409,
  "detail": "此搭子的確認窗口將於今天 18:30 開啟。",
  "code": "pr.partner.confirm.outside_window",
  "instance": "/api/pr/123/confirm"
}
```

Recommended status mapping:

- `401` unauthenticated viewer
- `403` authenticated but missing stronger identity capability
- `409` state conflict or temporal conflict
- `422` semantically invalid payload

## Frontend Contract

### 1. Raw API Layer

Frontend keeps one typed query:

```ts
usePRActionPreflight(prId, requestedActions?)
```

It returns raw backend decisions without page-local interpretation.

### 2. Reusable UI Adapter

Frontend converts raw decisions into UI-ready state through one adapter:

```ts
type ActionPresentation =
  | { kind: "enabled" }
  | { kind: "disabled"; problem: LocalizedActionProblem; nextRelevantAt: string | null }
  | { kind: "hidden"; problem: LocalizedActionProblem | null }
  | { kind: "replace"; cta: "login" | "bind_wechat" | "claim_booking_contact"; problem: LocalizedActionProblem };

resolveActionPresentation(
  action: PRActionName,
  decision: ActionDecision,
  context: ActionSurfaceContext,
): ActionPresentation
```

This keeps a clean split:

- backend owns action truth
- frontend owns surface policy

The adapter shape itself belongs in shared frontend substrate:

```ts
resolveActionPresentation(
  action: ActionName,
  decision: ActionDecision,
  context: ActionSurfaceContext,
): ActionPresentation
```

Each domain then supplies its own action-name union and presentation registry.

### 3. Hide, Disable, Replace Rules

`allowed: false` should not collapse into one single UI behavior.

Recommended policy:

- `hidden`
  - action is irrelevant on this surface
  - example: viewer has no partner slot, so `confirm` is absent
- `disabled`
  - action is relevant and informative, but temporarily blocked
  - example: confirmation window not started, join lock reached
- `replace`
  - user can still progress through another CTA
  - example: login required, WeChat binding required

This policy belongs in frontend action presentation registry, not in backend preflight payload.

### 4. Problem Details Reuse

Frontend should reuse backend-localized problem payload in three places:

- disabled-button inline hint
- dialog body
- toast body after command failure

Recommended helpers:

```ts
toInlineHint(problem)
toToastPayload(problem)
toDialogPayload(problem)
```

These helpers format placement and severity only. They do not own domain copy.

### 5. Query And Mutation Reuse

Recommended action hook shape:

```ts
usePRAction(actionName, {
  preflightQuery,
  mutation,
  resolvePresentation,
  onProblem,
})
```

Responsibilities:

- use preflight result to produce button state
- execute command mutation
- on RFC 9457 failure, reuse `problem.title` and `problem.detail` for toast or dialog
- invalidate preflight and detail reads after mutation success

## Open Decisions For Discussion

1. Whether `actions` query filtering is worth the extra surface area, or whether fixed full evaluation is cleaner.
2. Which denial codes should map to `replace` rather than `disabled`.
3. Whether preflight should include an optional `refreshAfterMs` convenience field in addition to `nextRelevantAt`.
4. Whether the shared substrate should live under backend/frontend `shared` folders first, then become a workspace package only after the second domain adopts it.
