# Documentation Diagnosis Result (2026-03-26)

## How this diagnosis was executed

This task was split into three focused diagnosis tracks plus one synthesis track (see `L0-PLAN.md` and `L1-TRACK-*.md`).

- Track A: PRD / domain semantics
- Track B: frontend interface contracts
- Track C: backend interface contracts
- Track D: synthesis + prioritization

> Note: no fixes are applied in this packet; this is diagnosis-only.
>
> Follow-up remediation plan: see `REMEDIATION-PLAN.md` and `MIGRATION-MAP.md`.

---

## Track A — PRD / Domain Semantics

### A1. PR status model is under-specified (missing `LOCKED_TO_START`)

- **Doc side**: PRD describes lifecycle transitions in broad language, but does not expose the full runtime status set.
- **Code side**: runtime includes `LOCKED_TO_START` in backend status enum + transition logic and in frontend status presentation.
- **Defect type**: under-specification / hidden state.
- **Impact**: policy interpretation and cross-team communication can drift, especially around “join allowed vs blocked” timing windows.
- **Priority**: **High**.

### A2. PRD says users cannot manually create Anchor PR, but implementation supports it

- **Doc side**: rules state that current version does not provide a user entry for manual Anchor PR creation.
- **Code side**: backend exposes user-managed Anchor PR creation API (`POST /api/events/:eventId/batches/:batchId/anchor-prs`), and frontend has an explicit query module for this creation path.
- **Defect type**: direct behavior contradiction.
- **Impact**: product policy docs can mislead roadmap and QA scope.
- **Priority**: **Critical**.

---

## Track B — Frontend Interface Contracts

### B1. Route inventory in `frontend/interfaces.md` is materially incomplete

- **Doc side**: route list is partial and wildcard-heavy.
- **Code side**: router contains multiple concrete routes absent from the document, including:
  - `/cpr/new`
  - `/cpr/:id/partners/:partnerId`
  - `/apr/:id/partners/:partnerId`
  - `/apr/:id/booking-support`
  - `/admin/login`
  - `/admin/anchor-pr`
  - `/admin/booking-support`
  - `/admin/pois`
- **Defect type**: contract inventory incompleteness.
- **Impact**: reviewers may miss route-level breakage and ownership decisions.
- **Priority**: **High**.

### B2. Interface wording is ambiguous (“interface” vs “examples”)

- **Doc side**: file title implies interface contract, but content behaves like a partial sample.
- **Defect type**: wording/contract boundary ambiguity.
- **Impact**: inconsistent expectations for what must stay in sync when routes evolve.
- **Priority**: **Medium**.

---

## Track C — Backend Interface Contracts

### C1. Admin API surface is under-represented in backend interface docs

- **Doc side**: admin mention concentrates on booking-execution examples.
- **Code side**: admin surface also includes anchor management, booking-support, and POI management families.
- **Defect type**: interface inventory incompleteness.
- **Impact**: underestimates compatibility blast radius of admin changes.
- **Priority**: **High**.

### C2. `/health` public endpoint is missing from documented inbound interfaces

- **Doc side**: public HTTP section omits `/health`.
- **Code side**: backend publishes `GET /health` with status + job-runner state.
- **Defect type**: operational contract omission.
- **Impact**: runbook and observability discoverability gap.
- **Priority**: **Medium**.

---

## Synthesis — Prioritized defect list

1. **Critical**: A2 (Anchor PR creation contradiction)
2. **High**: A1 (status model under-specification)
3. **High**: B1 (frontend route inventory incompleteness)
4. **High**: C1 (backend admin surface incompleteness)
5. **Medium**: C2 (`/health` omission)
6. **Medium**: B2 (interface wording ambiguity)

---

## Recommended document-only next steps

1. Add an explicit status table (including `LOCKED_TO_START`) in PRD + Unit TDD.
2. Resolve A2 by aligning PRD rule text with current runtime scope (or mark as intentional temporary divergence with date/owner).
3. Split interface docs into:
   - “Canonical core routes” (stable public-facing subset), and
   - “Full implemented route inventory” (for engineering impact analysis).
4. Add `/health` to backend inbound interfaces and cross-link to deployment observability/recovery docs.
5. Add a small “contract completeness rule” in doc-system guidance: if file title says “Interfaces”, route/API inventory must be explicitly scoped as either full or partial.
