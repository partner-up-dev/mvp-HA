# AGENTS.md of PartnerUp MVP Hypothesis-A

PartnerUp helps users find a partner (搭子) effectively and safely.

## Repository Layout

```text
/
|-- apps/
|   |-- backend/
|   `-- frontend/
|-- docs/                 # Durable product and technical truth
|-- tasks/                # Volatile work, diagnosis, and temporary reasoning
`-- scripts/
```

## Technical Overview

- Monorepo: pnpm workspace
- Backend: Hono + Drizzle ORM + Postgres-oriented schema / migration workflow
- Frontend: Vue 3 + Vite + TanStack Vue Query + Hono RPC client

## Documentation

Read following documents for the current work when needed and keep them current.

- `docs/00-meta/`: typed input routes, mode SOPs, and framework concepts.
- `docs/00-meta/concepts.md`: load only when boundary language or owner terminology is unclear.
- `docs/10-prd/`: product what/why, user-visible workflows, rules, scope, and business vocabulary.
- `docs/15-alignment/`: load only when MVT is not enough to constrain mutation safely.
- `docs/20-product-tdd/`: cross-unit technical realization and authority boundaries.
- `docs/30-unit-tdd/`: open only when a named hard-unit doc exists and is relevant.
- `docs/40-deployment/`: runtime, rollout, observability, and recovery truth.
- `tasks/`: active entropy buffer for non-trivial work. Every non-trivial task packet should record `Objective & Hypothesis`, `Guardrails Touched`, and `Verification`.
- `apps/backend/AGENTS.md`, `apps/frontend/AGENTS.md`, and nearer `**/AGENTS.md`: local constraints are additive and should be checked before edits in that subtree.

## Operating Model

1. Classify the incoming request as `Intent`, `Constraint`, `Reality`, or `Artifact`.
2. Identify the durable owner and blast radius before choosing how to work.
3. For non-trivial work, open or update a task packet under `tasks/`.
4. Choose the active mode for the current slice: `Explore`, `Solidify`, `Execute`, or `Diagnose`.
5. Load only the route doc, mode SOP, and governing anchors needed for that slice.
6. Expand into alignment substrate fields only when references, boundaries, state, evidence, or blast radius are still ambiguous.
7. Execute with explicit verification.
8. Re-enter a different mode if evidence or clarity changes.
9. Promote only stable truths after verification.

### Typed Input Guide

- `Intent`: the business wants new behavior, scope, or policy. Update PRD first.
- `Constraint`: product behavior stays the same, but technical, dependency, or environment boundaries changed. Update Product TDD or Unit TDD.
- `Reality`: observed runtime behavior diverges from expectation. Gather evidence first, then fix and add recurrence guards if needed.
- `Artifact`: the requested deliverable is a bounded script, analysis, migration helper, or one-off output. Keep it tactical unless reuse is proven.

### Mode Guide

- `Explore`: map unknowns, alternatives, and assumptions.
- `Solidify`: restate findings into explicit claims, contracts, or decisions.
- `Execute`: implement a clear, verified change.
- `Diagnose`: investigate mismatches between expected and observed reality.

Mode guidance:

- do not assume one task equals one mode
- switch modes when evidence or clarity changes
- mode selection never overrides durable ownership

### Impact Handshake

Before mutating durable truth after alignment expansion, or when blast radius is not obviously local, pause and restate:

- Address and Object: what exact files, anchors, or symbols will change
- State Diff: `From -> To`
- Blast Radius Forecast: what downstream files, modules, or surfaces could be affected
- Invariants Check: what must remain unchanged
- Verification: what concrete proof will bound side effects

If evidence is missing or the durable owner is still unclear, return to `Explore` or `Diagnose` instead of guessing.

### Negotiation Triggers

Pause and ask for human confirmation when:

- the requested change conflicts with an existing product claim or technical contract
- blast radius crosses multiple durable owners and the correct owner is unclear
- a shortcut would damage maintainability, readability, simplicity, or an explicit guardrail
- evidence is insufficient for a bug fix or architectural decision

## Development Workflow

- Use GitHub CLI (`gh`) for GitHub operations and issue workflows.
- Keep tests and guardrails aligned with behavior changes; do not ship by build-only confidence.
- Prefer the smallest reviewable mutation that moves the repo toward the declared owner model.
- Follow `./CONTRIBUTING.md` for commit message format and release policy.

## Coding Guidelines

- No `any`.
- Prefer `async` / `await` over raw Promise chains.
- Enforce data correctness at system boundaries.
