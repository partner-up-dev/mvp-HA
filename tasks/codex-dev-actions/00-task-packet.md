# Codex Dev Actions

## Objective & Hypothesis

Add Codex app actions for the common local development server workflow.

Hypothesis: wiring Codex actions to a small port-aware PowerShell helper gives quick access to frontend and backend dev servers while avoiding duplicate server processes when ports are already occupied.

## Guardrails Touched

- Input route: Constraint
- Mode: Execute
- Durable owner: local development environment config under `.codex/environments/environment.toml`
- Tactical helper: `scripts/start-dev-server-if-port-free.ps1`
- Product behavior: unchanged
- Runtime deployment behavior: unchanged

## Verification

- Parse the PowerShell helper with the PowerShell parser.
- Parse `.codex/environments/environment.toml` as TOML.
- Exercise each action target with a temporary listener on the configured port to prove the helper exits instead of launching a duplicate server.

## Verification Results

- PowerShell parser accepted `scripts/start-dev-server-if-port-free.ps1`.
- Python `tomllib` accepted `.codex/environments/environment.toml` and found both actions.
- Temporary listener on `4001` made the frontend helper skip duplicate startup.
- Temporary listener on `4002` made the backend helper skip duplicate startup.
