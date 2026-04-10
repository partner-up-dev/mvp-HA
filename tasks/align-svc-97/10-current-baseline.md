# Current Baseline Before SVC v9.7 Alignment

## 1. Repo Shape

Current top-level shape:

```text
/
|-- AGENTS.md
|-- apps/
|   |-- backend/
|   `-- frontend/
|-- docs/
|   |-- 10-prd/
|   |-- 15-alignment/
|   |-- 20-product-tdd/
|   |-- 30-unit-tdd/
|   |-- 40-deployment/
|   `-- task/
`-- scripts/
```

Observed facts:

- There is no top-level `tasks/` directory in the current repo baseline.
- There is no `docs/00-meta/` directory.
- There is a local framework snapshot at `docs/_svc_v91.md`.
- `docs/plan/` is mentioned in root `AGENTS.md`, but it does not currently exist in the repo.

## 2. Code Structure

### Backend

- Container: `apps/backend`
- Stated architecture: domain-oriented layered backend with controllers -> use-cases -> domain services -> repositories -> entities, plus cross-cutting infra for events, jobs, analytics, and operation logs.
- Source folders currently present under `apps/backend/src/`:
  - `auth`
  - `controllers`
  - `domains`
  - `entities`
  - `infra`
  - `lib`
  - `repositories`
  - `scripts`
  - `services`
- Interpretation: backend structure is already close to SVC's "implementation truth in code" posture. Documentation alignment pressure is primarily around entry protocol and durable owner language, not around backend folder design.

### Frontend

- Container: `apps/frontend`
- Stated architecture: domain-first Vue 3 frontend with `app`, `domains`, `shared`, `processes`, and route `pages`.
- Source folders currently present under `apps/frontend/src/`:
  - `app`
  - `domains`
  - `lib`
  - `locales`
  - `pages`
  - `processes`
  - `queries`
  - `router`
  - `shared`
  - `stores`
  - `styles`
  - `types`
- Interpretation: the active architecture is mostly aligned, but the codebase still keeps explicit legacy compatibility seams (`lib`, `queries`, `router`, `stores`) that make a pure structure reading slightly noisier. This is a code-structure observation, not necessarily a v9.7 problem.

### Local Context Layer

- There are 12 `AGENTS.md` files in the repo.
- Several of them are already close to the v9.7 local-context intent: short tactical constraints near code instead of bloated durable prose.
- The root and package `AGENTS.md` files remain the main front-door drift points.

## 3. Durable Doc Structure

Current durable folders:

- `docs/10-prd/`
- `docs/15-alignment/`
- `docs/20-product-tdd/`
- `docs/30-unit-tdd/`
- `docs/40-deployment/`

Current state by layer:

- PRD: structurally present and coherent, but product vocabulary still lives in `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md` instead of `docs/10-prd/glossary.md`.
- Alignment: present, but named and framed as `Alignment Pack`, not `Alignment Substrate`.
- Product TDD / Unit TDD / Deployment: present and broadly coherent; likely they need wording and index cleanup more than layer creation.
- Meta Engine: absent.

## 4. Task / History Structure

Current task-layer facts:

- `docs/task/` contains 35 task folders and 100 markdown files.
- Packet shapes are heterogeneous: `L0-PLAN`, `L1-PLAN`, `L2-PLAN`, `L3-PLAN`, `PLAN`, `PLAN-L2`, `PROPOSAL`, `RESULT`, `WORKING-SET`, and `DRIFT_DIAGNOSIS`.
- Root and package `AGENTS.md` files still route volatile work into `docs/task/<task>/`.
- Historical task packets explicitly recorded a decision to keep `docs/task/` and to avoid introducing top-level `tasks/` during earlier migrations.

## 5. Legacy Doc Signals

High-signal historical artifacts discovered during exploration:

- `docs/_svc_v91.md` mirrors an old framework version locally.
- `docs/task/align-svc-v9/DRIFT_DIAGNOSIS.md` evaluates the repo against v9.1, not v9.7.
- `docs/task/diagnose-doc-260326/*` documents a deliberate v8-era removal of `docs/00-meta/`.
- `docs/task/refactor-doc-system/*` documents an even earlier deliberate decision to keep `docs/task/` and treat top-level `tasks/` as out of scope.

Pattern counts from repo-wide scan over `AGENTS.md`, `apps/**`, and `docs/**` markdown:

- `docs/task`: 14 files
- `docs/00-meta`: 5 files
- `docs/product/`: 18 files
- `vocabulary-and-lifecycle.md`: 4 files
- `Alignment Pack`: 2 files
- `_svc_v91.md`: 1 file

Interpretation:

- The repo contains several layers of superseded migration history.
- Those artifacts are useful evidence for this task, but they are also a major source of reading noise for future alignment work.

## 6. Preliminary Reading

The repo is not starting from zero.

It is already partially aligned in these areas:

- durable folders `10/15/20/30/40` exist
- package and local `AGENTS.md` files exist
- frontend and backend both have coherent architectural sources of truth
- Product TDD and Deployment docs are already relatively lean

The repo is clearly behind v9.7 in these areas:

- typed front-door classification
- `docs/00-meta/`
- canonical `tasks/`
- alignment-substrate language and primitives
- glossary ownership
- cleanup / archival governance for historical task packets
