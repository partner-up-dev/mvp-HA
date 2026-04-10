# Gap Map - Current Repo vs SVC v9.7

## Summary

The repo is not missing the SVC shape entirely. The main gap is that it carries a mixed stack of v8 / v9.1 / local transitional decisions, while SVC v9.7 expects a sharper front door, a restored meta layer, canonical `tasks/`, and a stronger alignment substrate grammar.

## Gap Matrix

| Area | SVC v9.7 target | Current repo state | Gap | Recommended owner / action |
| --- | --- | --- | --- | --- |
| Root front door | Root `AGENTS.md` classifies perturbations as Intent / Constraint / Reality / Artifact before choosing a mode | Root `AGENTS.md` is still ambiguity-first and mode-first (`Mode A/B/C`) | High | Rewrite root `AGENTS.md` around typed input + mode overlays |
| Mode set | Explore / Solidify / Execute / Diagnose as reusable SOP overlays | Repo documents only `Mode A/B/C`; no Diagnose mode in the durable front door | Medium | Add `Mode D` via `docs/00-meta/` and simplify root wording |
| Meta layer | `docs/00-meta/` exists and owns route protocols, mode SOPs, and concepts | `docs/00-meta/` is absent; older tasks explicitly removed it | High | Restore `docs/00-meta/` with the minimal v9.7 file set |
| Task layer path | Top-level `tasks/` is canonical | Repo still uses `docs/task/`; earlier task history explicitly defended that choice | High | Make `tasks/` active, then freeze / archive `docs/task/` |
| Task protocol | Non-trivial tasks use MVT anchors (`Objective & Hypothesis`, `Guardrails Touched`, `Verification`) | Historical packets use mixed `L0/L1/L2/L3`, `PROPOSAL`, `RESULT`, `WORKING-SET` formats | High | Adopt MVT for new packets; do not normalize all historical packets blindly |
| Alignment layer naming | `Alignment Substrate` | Current docs say `Alignment Pack` | Medium | Rewrite `docs/15-alignment/README.md` and related references |
| Alignment semantics | Seven coordination primitives + impact handshake relation | Current alignment docs only define basic target formats and a short template | High | Replace template and README semantics with v9.7 substrate rules |
| Surface maps | Prefer calculable maps from stable anchors | Current `ui-map.yaml` is a hand-maintained partial hot-surface map | Medium | Keep only if still justified; otherwise shrink or reframe as partial derived aid |
| PRD glossary ownership | Business vocabulary in `docs/10-prd/glossary.md` | Vocabulary still lives in `docs/10-prd/domain-structure/vocabulary-and-lifecycle.md`; no `glossary.md` exists | High | Add `glossary.md`; split lifecycle vs glossary responsibilities |
| Framework snapshot policy | Source truth comes from active framework source, not stale local mirror | Repo keeps `docs/_svc_v91.md` | Medium | Delete or archive local snapshot once migration references point to v9.7 source |
| Historical meta decisions | Old migration decisions should not compete with active truth | Historical task packets still contain now-opposed decisions (`remove docs/00-meta`, `keep docs/task`) | High | Quarantine as legacy history and stop treating them as navigational guidance |
| Package AGENTS task routing | Package guidance should point to `tasks/` and `docs/00-meta/` | `apps/frontend/AGENTS.md` and `apps/backend/AGENTS.md` still point to `docs/task/` and do not mention `docs/00-meta/` | High | Update package `AGENTS.md` after root route is settled |
| Local context layer | Tactical constraints near code are encouraged | Repo already has 12 `AGENTS.md` files, including local ones under `src/**` | Low | Keep; only adjust wording when route / path guidance changes |
| Product TDD / Deployment file set | Minimal, durable, owner-clean | Current file sets are already reasonably close | Low | Targeted wording cleanup only |

## Main Structural Tension

The repo currently has two contradictory historical forces:

1. older remediation work that intentionally collapsed `docs/00-meta/` and kept `docs/task/`
2. SVC v9.7, which explicitly restores `docs/00-meta/` and makes `tasks/` canonical

This means the upcoming alignment should not pretend the current shape is an accidental typo. It is a prior local policy that now needs a deliberate reversal.

## Main Practical Tension

Historical task packets are both:

- useful migration evidence
- a major source of reading noise

Therefore the cleanup strategy should separate:

- active truth to rewrite
- stale framework mirrors to delete
- historical task packets to freeze and archive

Rather than treating all legacy docs as one deletion bucket.
