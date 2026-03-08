# AGENTS.md of PartnerUp MVP

PartnerUp is a platform helping user find their partners effectively and safely.
And this repository is a pnpm workspace with following packages implementing PartnerUp MVP:

- `apps/backend`
- `apps/frontend`

## Documentation

Read following documents when needed and keep them current:

- `apps/backend/AGENTS.md`
- `apps/frontend/AGENTS.md`
- `docs/product/overview.md`
- `docs/product/features/*.md`

> Documents in `docs/plan`, `docs/task` are temporary, don't read or update them.

### Top-level Glossary

- 搭子请求 (PartnerRequest, PR): 承载搭子活动全生命周期的模型

> Read more in `docs/product/glossary.md`

## Development Workflow

- No need to maintain tests, just make sure the build passes.

## Coding Guidelines

- No any: The use of any is strictly prohibited.
- Async/Await: Always use async/await over raw Promises.
