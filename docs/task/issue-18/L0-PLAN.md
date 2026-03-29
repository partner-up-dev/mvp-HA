# L0 Plan (Problem Framing & Constraints)

## Task Name
issue-18

## Issue Link
- GitHub: `#18 首页二次优化`

## Original Intention To Preserve
- Make HomePage a qualified Landing Page for new users.
- Reduce first-glance aversion and improve overall UI/UX quality.
- Let users form a clearer product impression and scene association.
- Push users into a real product-use path quickly, not just read abstract copy.

## Confirmed Product Assumptions
- Target users already know what `搭子 / 找搭子` means at a cultural level.
- HomePage must not explicitly expose `Anchor PR` vs `Community PR` as homepage IA.
- Hero is feeling-first; it sets tone and promise, but does not need to carry the full product truth/trust explanation.
- Event Section is the first key path because it gets users into Anchor participation quickly.
- Community PR creation is the second key path, used when current supply does not satisfy demand.
- The page should stay simple and avoid literal 3D / scrollytelling-heavy execution.

## Current Implementation Snapshot
- `HomePage.vue` already follows `Hero -> Event -> lower action section -> footer`.
- The event block uses horizontal scroll snap and currently pulls the first four events from `GET /api/events`.
- The lower action section is still semantically framed as a secondary action bundle instead of a true fallback create path.
- The footer still behaves more like a small sitemap than a landing close.
- When event data fails, the page loses too much persuasive energy.

## Core Design Responsibility Split
- Hero: feeling, tone, promise, handoff.
- Event Section: first-use path into Anchor participation.
- Fallback Create Path: unmet-demand capture into Community PR creation.
- Footer/Tail: continuation, support, and light trust continuation.

## Stage Split
- Stage 1: structural polish and responsibility alignment on the existing homepage skeleton.
- Stage 2: stronger event-first conversion expression and scene-binding polish.
- Stage 3: micro-delight, retention, and measurement refinement.
