# AGENTS.md of PartnerUp MVP

PartnerUp is a platform helping user find their 搭子 effectively and safely.
And this repository is a pnpm workspace with following packages implementing PartnerUp MVP:

- `apps/backend`
- `apps/frontend`

## Documentation

Read following documents when needed and keep them current:

- `docs/10-prd/index.md`
- `docs/10-prd/**/*.md`
- `docs/20-product-tdd/*.md`
- `docs/40-deployment/*.md`
- `docs/30-unit-tdd/<unit>/*.md` only when a named hard-unit doc exists and is relevant
- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`

Documentation owner rules:

- `AGENTS.md` owns repo-local navigation and doc-layer rules.
- `docs/10-prd/*` owns product what/why, workflows, rules, and scope.
- `docs/20-product-tdd/*` owns cross-unit technical truth.
- `docs/30-unit-tdd/*` exists only for genuinely hard local units.
- `docs/40-deployment/*` owns runtime and operational truth.
- Prefer code, tests, schemas, and CI for mechanically enforceable truth.

> Documents in `docs/plan` are temporary, don't read or update them.
>
> Documents in `docs/task` are temporary task packets. Only read or update the active task folder when the current task explicitly uses it.

### Top-level Glossary

- 搭子请求 (PartnerRequest, PR): 承载搭子活动全生命周期的模型

> Read more in `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`

## Development Workflow

- No need to maintain tests, just make sure the build passes.
- Deeply integrated with GitHub:
  - Use Github CLI (`gh`) to interact with GitHub.
  - Manage issues, make use of templates (check `.github/ISSUE_TEMPLATE`)

## Coding Guidelines

- No any: The use of any is strictly prohibited.
- Async/Await: Always use async/await over raw Promises.
