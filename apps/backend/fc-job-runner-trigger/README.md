# job-runner-trigger (Aliyun FC Timer Function)

This function is used as a timer-triggered bridge for serverless scheduling.
It sends `POST` requests to backend `/internal/jobs/tick` endpoints.

## File

- Handler entry: `job-runner-trigger.cjs`
- Exported handler: `exports.handler`

## Environment Variables

- `JOB_RUNNER_TICK_URL` (required)
  Comma-separated target URLs.
  Example:
  `https://env-a.example.com/internal/jobs/tick,https://env-b.example.com/internal/jobs/tick`
- `JOB_RUNNER_INTERNAL_TOKEN` (required)
  Sent via header `x-internal-token`.
- `JOB_RUNNER_TRIGGER_REQUEST_TIMEOUT_MS` (optional)
  Per-request timeout in milliseconds. Default: `20000`.

## Runtime Behavior

1. Parse `JOB_RUNNER_TICK_URL` by `,` and trim spaces.
2. Trigger all URLs in parallel using `fetch`.
3. Any non-2xx response is treated as failure.
4. If at least one URL fails, the whole invocation fails.
5. If all URLs succeed, invocation succeeds and returns per-URL results.

## Failure Semantics

- Fail-fast is not used; all targets are attempted in the same invocation.
- Error message includes failed URLs and response summary.

## Deployment

- FC template: `apps/backend/fc-job-runner-trigger/s.yaml`.
- CI workflow for this function:
  `.github/workflows/job-runner-trigger-fc-deploy.yml`
