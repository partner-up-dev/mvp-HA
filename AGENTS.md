# AGENTS.md of PartnerUp MVP

PartnerUp is a platform helping user find their partners effectively and safely.
And this repository is a pnpm workspace with following packages implementing PartnerUp MVP:

- `apps/backend`
- `apps/frontend`

## Documentation

Read following documents when needed and keep them current:

- `docs/00-meta/*.md`
- `docs/10-prd/index.md`
- `docs/10-prd/**/*.md`
- `docs/20-product-tdd/*.md`
- `docs/30-unit-tdd/**/*.md`
- `docs/40-deployment/*.md`
- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`

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
