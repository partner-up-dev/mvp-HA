# AGENTS.md of PartnerUp MVP-HA

This is a pnpm workspace (monorepo) with following packages:

- `apps/backend`
- `apps/frontend`
- `packages/api-contract`
- `packages/design`

## Development Workflow

- [RECOMMENDED] Read following documents when you need
  - `apps/backend/AGENTS.md`
  - `apps/frontend/AGENTS.md`
  - `packages/api-contract/AGENTS.md`
  - `packages/design/AGENTS.md`
- You MUST update the documents that are outdated or inconsistent with the current state (or the changes you are about to make).
- Use `pnpm` to manage dependencies, run scripts. (Use `pnpm --filter` to run package-specific operations.)

## Coding Guidelines

- No any: The use of any is strictly prohibited.
- Async/Await: Always use async/await over raw Promises.
