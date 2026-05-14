# Reporter And Artifacts Spike

## Risk

The current scenario output is too long for agent workflows because test runner
output, migrations, Vite logs, backend request logs, and full scenario records
share one terminal stream.

The migration should improve output while preserving enough failure detail to
debug without rerunning blindly.

## Target Output Model

Terminal default:

```text
backend-unit: 24 passed
frontend-unit: 3 passed
backend-scenario: 42 passed
system-scenario: 13 passed
```

Failure default:

```text
system-scenario failed
  pr_detail_joiner_reaches_confirm_action
  Expected visible locator [data-testid=...]
  records: prId=..., joinerUserId=...
  artifact: tests/scenario/.result/pr_detail_joiner_reaches_confirm_action.json
```

Detailed files:

```text
apps/backend/.result/
apps/frontend/.result/
tests/scenario/.result/
```

## Candidate Design

- Use Vitest built-in `agent` reporter as the first default candidate.
- Add JUnit or JSON output per project for CI.
- Keep scenario `ctx.record()` in memory during a test.
- On failure, persist full scenario context to the suite `.result` directory.
- Keep terminal scenario context compact by limiting displayed keys or values.
- Capture raw infrastructure logs separately from test reporter output.

## Questions To Prove

- Does the `agent` reporter show enough failure location and assertion detail?
- Can scenario records be surfaced through Vitest annotations or attachments?
- Are attachments visible in terminal, JSON, JUnit, or HTML outputs?
- Is a custom reporter needed to print compact scenario records?
- Can infrastructure logs be captured without hiding fatal startup errors?
- What is the cleanest `.result` file naming scheme for scenario names?

## Minimal Probe

- Create one passing and one intentionally failing scenario probe.
- Record small and large `ctx.record()` payloads.
- Run with `agent`, `dot`, `json`, and `junit` reporters.
- Check terminal length, failure usefulness, and artifact contents.
- Delete the probe after findings are recorded.

## Stop Conditions

- Built-in reporter hides the failing test name or source location.
- Scenario records cannot be attached or persisted without invasive test code.
- CI reporter cannot receive enough failure detail.
- Artifact paths are difficult to associate with failing scenarios.
