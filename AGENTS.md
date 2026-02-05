# AGENTS.md of PartnerUp MVP-HA

This is a pnpm workspace (monorepo) with following packages:

- `apps/backend`
- `apps/frontend`

## Development Workflow

- [RECOMMENDED] Read following documents when you need
  - `apps/backend/AGENTS.md`
  - `apps/frontend/AGENTS.md`
- You MUST update the documents that are outdated or inconsistent with the current state (or the changes you are about to make).
- Use `pnpm` to manage dependencies, run scripts. (Use `pnpm --filter` to run package-specific operations.)

## Documentation System

- Product docs live in `docs/product/` with `overview.md`, `features/*.md`, and `glossary.md`.
- Feature docs must only include: user stories, flow, acceptance criteria, and involved surfaces.
- Repo-level docs live in each package `AGENTS.md` and should stay aligned with code.
- Key decisions live in `docs/h_a_mvp_key_decisions.md`.
- Code is the source of truth; docs are for communication.

## Coding Guidelines

- No any: The use of any is strictly prohibited.
- Async/Await: Always use async/await over raw Promises.

## Current State

- Create a collaboration PartnerRequest (aka “partner request / 搭子请求”) from an existing natural-language sentence. Creation is paste-first; the system parses time/type only.
- PartnerRequest/PR status currently implemented in code: OPEN / ACTIVE / CLOSED. (Product definition also includes EXPIRED, not yet implemented.)
- Sharing:
  - By copying link as text: yes.
  - To Xiaohongshu: initial version, need polish.
  - To WeChat chat (WeChat WebView menu share): yes (JS-SDK, generates a share card with thumbnail).
