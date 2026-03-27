# Unit TDD Index

## Role In The System

`docs/30-unit-tdd/` is an optional layer for hard local units only.

Use it when code plus Product TDD are no longer enough to preserve a fragile local truth. Do not use it as a default package manual.

## What This Layer Owns

- local invariants that are easy to violate
- non-obvious local authority or state rules
- risky interaction or failure semantics inside one hard unit
- unit-specific verification expectations when they are costly to rediscover

## What Must Not Appear Here

- repo-global ontology
- product claims
- cross-unit contracts that belong in Product TDD
- deployment workflows that affect the whole system rather than one unit

## How To Read This Layer

1. read `docs/20-product-tdd/index.md` and relevant Product TDD docs first
2. open a unit folder only if one exists for the exact hard unit you are changing

Current repo state:

- there is no active hard-unit Unit TDD yet
- broad frontend/backend package folders were intentionally removed as over-broad

## How This Layer Connects To Adjacent Layers

- Upstream from Product TDD: unit docs inherit boundaries and contracts, and must not redefine them locally.
- Downstream to code: the unit implementation should honor the local design and verification expectations documented here.
- Sideways to deployment docs: unit-local operational notes may exist, but system-wide rollout or recovery belongs in deployment docs.

## Escalation Rule

If a local design decision changes another unit’s expectations, move the decision up to Product TDD instead of leaving it local.

## Common Local Mistakes

- redefining cross-unit contracts locally
- documenting product claims or drivers inside unit docs
- treating unit docs as a replacement for Product TDD
- burying system-wide deployment expectations inside unit notes
