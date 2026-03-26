# Promotion Rules

## Purpose

This file defines what should become durable truth, where it should live, and what should stay in task history only.

## Primary Mapping

- Documentation-system rules, ontology, read order, and layer semantics -> `docs/00-meta/*`
- Product drivers, claims, workflows, rules, scope, and derived domain vocabulary -> `docs/10-prd/*`
- System-level technical decomposition and cross-unit coordination -> `docs/20-product-tdd/*`
- Unit-local technical design -> `docs/30-unit-tdd/*`
- Runtime environments, rollout, observability, and recovery -> `docs/40-deployment/*`
- Temporary execution detail, negotiation notes, phased rollout notes, and one-off implementation steps -> `docs/task/*`

## Promote When

Promote a statement when it is:

- stable across more than one task
- important for future implementation or review
- costly to rediscover repeatedly
- intended to constrain future changes

## Do Not Promote When

Keep it in task history when it is:

- an implementation sequence specific to one task
- a temporary workaround
- a local debate that did not become a durable rule
- evidence that supports a decision but is not itself a contract

## Conflict Rule

If a new task discovers a conflict:

1. identify the current durable anchor
2. decide whether the anchor is wrong, incomplete, or merely underspecified
3. update the durable anchor intentionally rather than silently overriding it in task notes

## Legacy Rule

- do not restore durable truth to removed legacy folders such as `docs/product/*` or `docs/deployment/*`
- historical references in task/plan history are evidence, not canonical destinations
