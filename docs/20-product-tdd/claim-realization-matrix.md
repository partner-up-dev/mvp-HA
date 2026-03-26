# Claim Realization Matrix

| PRD claim | Backend realization | Frontend realization | Coordination note |
| --- | --- | --- | --- |
| 从一句话到可加入协作 | natural-language and structured PR creation APIs, draft/publish lifecycle, persisted PR state | landing entrypoints, create page, create flows, publish orchestration | backend owns created object semantics; frontend owns entry UX |
| Community 与 Anchor 分场景演进 | separate route families and scene-specific use cases/controllers | separate pages and domain UI for `/cpr/*` and `/apr/*` | shared base types, scene-specific contracts |
| 协作可传播、可回访 | canonical routes, share/meta endpoints, public config | share UI, route navigation, history lists, page-level re-entry | shared route contract and typed IDs |
| 协作需要可信度闭环 | confirmation rules, slot release, notifications, check-in, reliability persistence | CTA states, reminder subscription UI, check-in UI, explanation rendering | backend decides eligibility; frontend renders state and actions |
| 身份服务于协作而不是先于协作 | anonymous/local/authenticated flows, OAuth/bind, token rotation | auth bootstrap, local storage, OAuth redirects, pending action resume | mixed token + cookie contract must stay coherent |
