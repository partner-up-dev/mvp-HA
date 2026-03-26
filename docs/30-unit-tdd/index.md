# Unit TDD Index

## Role In The System

`docs/30-unit-tdd/` holds unit-local technical realization.

Each unit doc explains how one technical unit is structured internally while inheriting cross-unit rules from Product TDD.

## What This Layer Owns

- unit-local design
- unit-local interfaces
- unit-local state and data handling
- unit-local operational rules
- unit-local verification expectations

## What Must Not Appear Here

- repo-global ontology
- product claims
- cross-unit contracts that belong in Product TDD
- deployment workflows that affect the whole system rather than one unit

## How To Read This Layer

1. read `docs/20-product-tdd/index.md` and relevant `docs/20-product-tdd/*` first
2. open the relevant unit folder
3. read `README.md`, then `design.md`, then the more specific docs

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
