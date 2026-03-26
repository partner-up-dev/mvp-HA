# System Objective

## Purpose

Realize PartnerUp MVP-HA as a two-unit web system that keeps product semantics authoritative on the backend while keeping the frontend fast to iterate, type-safe, and browser-native.

## System Goals

- preserve backend authority over PartnerRequest lifecycle, participation, identity, and operational side effects
- expose those capabilities to the frontend through typed HTTP contracts instead of handwritten DTO drift
- support both community and anchor flows without splitting into separate deployables prematurely
- operate reliably in a scale-to-0 serverless environment
- keep admin and operational capabilities in the same system while maintaining clear user-facing and admin-facing boundaries

## Non-Goals

- splitting the monorepo into multiple independently deployed product services
- moving business truth into the frontend
- using deployment layout as the primary architecture model
