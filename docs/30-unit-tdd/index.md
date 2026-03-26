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

1. read `docs/20-product-tdd/*` first
2. open the relevant unit folder
3. read `README.md`, then `design.md`, then the more specific docs

## Escalation Rule

If a local design decision changes another unit’s expectations, move the decision up to Product TDD instead of leaving it local.
