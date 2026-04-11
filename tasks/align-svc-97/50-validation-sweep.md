# Validation Sweep

## Purpose

This sweep validates the repository state after Phases 1-5 of the SVC v9.7 alignment work.

It checks that active docs no longer depend on deleted legacy paths and that old findings inside this task packet are treated as historical audit notes, not current truth.

## Delegation

- Repository-hygiene validation was delegated to a read-only sub-agent focused on legacy cleanup residue.
- The parent agent also ran deterministic local scans to avoid relying on subjective review only.

## Mechanical Checks

### Git State

Command:

```powershell
git status --short
```

Result:

- clean before the validation report edits

### Deleted Legacy Artifacts

Command:

```powershell
rg --files docs | rg "(^|/)task(/|$)|_svc_v91\.md|vocabulary-and-lifecycle\.md"
```

Result:

- no matches

### Active Legacy-Pattern Residue

Command:

```powershell
rg -n "Mode A|Mode B|Mode C|Dynamic execution protocol|Alignment Pack|docs/task|_svc_v91|v9\.1" AGENTS.md docs/00-meta docs/10-prd docs/15-alignment docs/20-product-tdd docs/30-unit-tdd docs/40-deployment apps -g "*.md" -g "AGENTS.md" -S
```

Result:

- no matches

### Active Old-Path Residue

Command:

```powershell
rg -n "vocabulary-and-lifecycle|docs/product|docs/plan" AGENTS.md docs/00-meta docs/10-prd docs/15-alignment docs/20-product-tdd docs/30-unit-tdd docs/40-deployment apps -g "*.md" -g "AGENTS.md" -S
```

Result:

- no matches

### Documentation Language Rule

Command:

```powershell
rg -n "[\p{Han}]" AGENTS.md docs apps tasks -g "*.md" -g "AGENTS.md" -S
```

Result:

- Chinese text appears only in `docs/10-prd/glossary.md` term rows.

### Broken Local Markdown Links

Scope:

- `AGENTS.md`
- `docs/**/*.md`
- `tasks/**/*.md`
- `apps/**/*.md`, excluding `node_modules`

Result:

- no broken local markdown links found

## Findings

No active SVC v9.7 alignment blockers were found in the checked active docs.

Historical references to `docs/task`, `_svc_v91.md`, `Alignment Pack`, `v9.1`, and `vocabulary-and-lifecycle.md` remain inside earlier files in this task packet. They are acceptable because they document the pre-migration state and are not active routing or durable truth.

## Residual Risks

- This sweep validates documentation structure, references, and high-signal content boundaries. It does not prove product behavior or implementation correctness.
- The validation is not a formal parser for every possible markdown reference shape; it checks standard local markdown links.
- `ui-map.yaml` remains intentionally partial. That is acceptable only while it is treated as a hot-surface aid, not a complete UI inventory.
