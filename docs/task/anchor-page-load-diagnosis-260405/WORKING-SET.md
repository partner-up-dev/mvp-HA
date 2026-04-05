# Anchor Page Load Diagnosis Working Set

## Task Name

`anchor-page-load-diagnosis-260405`

## Goal

Diagnose why:

- `Anchor Event Page` feels slow or can appear stuck in loading
- `Anchor PR Page` feels significantly slower, with perceived load sometimes over 3 seconds

This packet tracks current findings, measurements, hypotheses, and the proposed fix order.

## Scope Anchors

### Frontend

- `event-detail > event-header > anchor-pr-list > create-anchor-pr > exhausted-banner`
- `anchor-pr-detail > summary > actions > share > reliability > support`

### Backend

- `anchor-event > get-event-detail > /api/events/:eventId > read path`
- `pr-anchor > get-anchor-pr-detail > /api/apr/:id > read path`
- `runtime > request-tail maintenance > outbox drain + due-job tick`

## In Scope

- Frontend route-level load sequence
- Backend read-path cost on event/pr detail APIs
- Non-essential startup requests that affect perceived speed
- Local reproduction notes required to keep measurements consistent

## Out Of Scope

- Product behavior redesign
- PRD / TDD promotion
- Production code changes in this packet

## Current Reproduction Baseline

### Local runtime

- Frontend dev server: `127.0.0.1:4001`
- Backend dev server: `127.0.0.1:4002`
- Frontend proxy uses `VITE_BACKEND_PORT=4002`
- Backend `dev` script does not auto-load `apps/backend/.env`; local diagnosis requires injecting that env file before `pnpm --filter @partner-up-dev/backend dev`

### Important local caveat

If backend is started on `3000` while frontend proxy still points to `4002`, `/events/:eventId` can look like "backend already 200 but page still loading". That symptom is a local port mismatch artifact, not the page's steady-state root cause.

## Confirmed Findings

### 1. Anchor Event Page local "stuck loading" was a proxy mismatch, not a broken loading state

- Frontend event detail page only gates on `useAnchorEventDetail(eventId)`.
- When frontend proxy and backend port match, `/events/1` leaves loading state normally.
- Browser verification on local dev showed the page body was rendered and no loading text remained.

### 2. Event detail API is heavier than event list API even on tiny data

Local baseline:

- `GET /api/events` about `14ms - 20ms`
- `GET /api/events/1` about `46ms - 72ms`

The measured event only had:

- `2` batches
- `2` PRs

So event detail already has a relatively high fixed cost even before larger real data or serverless cold-start overhead is added.

### 3. Event detail read path has two backend cost amplifiers

#### 3.1 Strong-consistency PR refresh inside read path

`get-event-detail` calls `readVisibleAnchorPRRecordsByBatchId(batch.id)` per batch.

That read service defaults to `strong` consistency, which triggers `refreshTemporalStatus` for every PR root before returning.

`refreshTemporalStatus` itself performs multiple repository/service operations:

- effective booking deadline resolution
- release checks
- anchor booking triggered sync
- expire / lock / activate decisions
- repeated `findById` normalization reads

#### 3.2 N+1 partner counting

After building each batch detail, `get-event-detail` loops through every PR and calls `countActivePartnersForPR(pr.id)` one by one.

### 4. Backend request-tail maintenance runs after almost every user request

For non-`OPTIONS`, non-`/health`, non-`/internal/*` requests, backend still performs in request tail:

- outbox drain
- due-job tick

Default budgets are currently:

- outbox drain timeout: `80ms`
- request-tail job tick budget: `80ms`

Given the deployment model is Aliyun Function Compute scale-to-0 serverless, this is a likely multiplier for perceived latency on read-heavy pages.

Important clarification:

- current implementation is not fire-and-forget
- request-tail work is explicitly `await`ed inside middleware `finally`
- therefore it stays on the response critical path

### 5. Anchor PR detail API itself is not locally slower than event detail

Local baseline for `GET /api/apr/12`:

- about `39ms - 60ms`
- response body size around `2625` bytes

This means the user-perceived slowness of `Anchor PR Page` is not explained by `/api/apr/:id` alone in local warm conditions.

### 5.1 Local warm-navigation baseline for APR route is also not inherently slow

Observed browser navigation timing on local dev:

- `domContentLoaded` about `328ms`
- `loadEventEnd` about `331ms`

So the local warm path confirms the page shell can render quickly when serverless cold-start and real OAuth roundtrip are absent.

### 6. Anchor PR Page triggers extra route-level work on top of the detail request

Observed page-load request sequence includes:

- anonymous session bootstrap
- auth session bootstrap
- route-level WeChat auto-login attempt
- `GET /api/apr/:id`
- `GET /api/apr/:id/reimbursement/status`
- `GET /api/pois/by-ids?...` after detail resolves and location gallery query becomes enabled

The route auto-login is specific to `/apr/:id`; `/events/:eventId` explicitly skips it.

### 7. Anchor PR Page has a route-level WeChat auto-login policy

Router metadata marks `/apr/:id` with:

- `wechatAutoLoginPolicy: "route"`

`AppRoot` mounts `useRouteWeChatAutoLogin()` globally. When the viewer is not authenticated and WeChat ability is available, entering `/apr/:id` attempts OAuth login immediately.

This is a strong candidate for the "APR page feels much slower" report, especially in real WeChat or serverless environments where OAuth roundtrip is materially slower than local mock conditions.

### 8. Anchor PR Page also fires a non-critical reimbursement query that can 401

`AnchorPRPage` starts `useAnchorReimbursementStatus(id)` immediately.

For anonymous viewers, local backend returned `401` for:

- `GET /api/apr/12/reimbursement/status`

This query does not block the page's top-level loading gate, but it is extra startup work and can keep reimbursement-specific UI in a loading/error loop depending on query retry policy.

## Working Hypotheses

### H1. Event page slowness in production is primarily backend read-path latency

Most likely contributors:

- request-tail maintenance on read requests
- strong-consistency temporal refresh on event detail reads
- N+1 partner counting

### H2. Anchor PR page slowness is primarily route startup behavior, not the detail API payload itself

Most likely contributors:

- global auth session bootstrap on app mount
- `/apr/:id` route-level auto-login
- non-critical reimbursement query during initial page load

### H3. Serverless runtime amplifies both pages differently

- Event page suffers more from expensive read-path computation.
- APR page suffers more from extra startup choreography around authentication and route policy.

## Candidate Fix Order

### Batch A: Lowest-risk latency wins

1. Exempt read-only GET pages from request-tail maintenance, or at least exempt detail read endpoints such as:
   - `/api/events/*`
   - `/api/apr/*`
2. Replace event detail partner count N+1 with a single aggregate query.
3. Move anonymous-only reimbursement fetch behind a stronger enable condition so anonymous viewers do not pay the request cost on first paint.

### Batch B: Medium-risk read-path tuning

1. Re-evaluate whether event detail can use `eventual` consistency instead of `strong`.
2. Re-evaluate whether reimbursement status must be fetched on initial APR page load or can be deferred until relevant UI becomes actionable.

### Batch C: Product / flow trade-offs that require confirmation

1. Reconsider whether `/apr/:id` should auto-trigger WeChat OAuth on route entry.
2. If auto-login remains required, consider deferring it until a gated action such as join / confirm rather than on initial view.

## Open Questions

1. In production, is the reported APR slowness observed mostly:
   - in WeChat browser
   - in normal mobile browser
   - for anonymous visitors
   - for already authenticated participants
2. Is current APR route auto-login an intentional product requirement, or only a convenience policy that can be relaxed?
3. Are read-after-write guarantees on event detail actually required strongly enough to justify `strong` consistency on first-page view?

## Next Investigation Steps

1. Capture the exact frontend trigger chain for APR startup:
   - auth bootstrap
   - auto-login
   - detail query
   - reimbursement query
2. Inspect whether reimbursement query retries after `401` under current Vue Query defaults.
3. Prototype the smallest-latency fix set:
   - no request-tail on read-only GET
   - no APR reimbursement startup fetch for anonymous viewer
   - event detail partner-count batching

## Implemented In This Round

### A. Event detail partner counts now use one aggregate query

Implemented:

- added repository method to count active participants for multiple PR ids in one grouped query
- replaced per-PR `countActivePartnersForPR` loop in event detail use-case with one aggregate read + in-memory assignment

Expected effect:

- removes the `N+1` count pattern
- improvement scales with number of PRs on the page
- tiny local sample data will not show a dramatic numeric drop because only `2` PRs were present

### B. APR reimbursement query no longer starts on anonymous first screen

Implemented:

- reimbursement query hook now supports an explicit `enabled` gate
- `AnchorPRPage` only enables that query when session is authenticated

Observed result on local anonymous first visit to `/apr/12`:

- `GET /api/apr/12/reimbursement/status` disappeared from startup request sequence
- the previous anonymous `401` is gone

Remaining startup requests still include:

- anonymous auth bootstrap
- route-level WeChat auto-login attempt
- `GET /api/apr/:id`
- POI lookup after detail resolves
- share-description generation

So this patch removes one unnecessary startup request, but it does not address the larger APR latency driver yet.

### C. Request-tail maintenance is now non-blocking, with explicit maintenance tick support

Implemented:

- request-tail no longer awaits outbox drain and job tick before request completion
- backend now exposes `/internal/maintenance/tick` for explicit outbox + due-job maintenance
- existing FC timer trigger can be repointed to the maintenance endpoint without changing the trigger runtime code

Current structure after refactor:

- request-tail: best-effort non-blocking kick
- `/internal/maintenance/tick`: explicit outbox + job maintenance path
- `/internal/jobs/tick`: jobs-only compatibility path

Important reasoning:

- this repo's deployment/runtime docs already allow best-effort post-response background progress
- explicit maintenance tick is required because fire-and-forget alone is not reliable in scale-to-0 serverless

Manual local verification:

- `POST /internal/maintenance/tick` succeeded and returned outbox/jobs summary
- local empty-summary sample:
  - outbox processed events: `0`
  - jobs claimed: `0`
  - total duration: about `24ms`

## Post-Change Measurements

### Event detail

Local warm samples after the aggregate-count patch:

- `GET /api/events/1` about `57ms - 69ms` in steady runs
- one outlier around `126ms`

Interpretation:

- no regression seen in steady warm samples
- local event `1` is too small to show a large gain from removing `N+1`
- the main value here is cost growth control on larger events

### APR detail

Local warm samples after anonymous reimbursement gating:

- `GET /api/apr/12` about `56ms - 64ms` in steady runs
- one outlier around `147ms`

Interpretation:

- detail API itself remains in the same cost band
- startup sequence is cleaner because anonymous reimbursement fetch is removed
- dominant perceived-delay sources for APR still appear to be auth/bootstrap/auto-login side effects rather than the detail payload

### Request-tail non-blocking impact

After waiting longer than `REQUEST_TAIL_JOB_TICK_MIN_INTERVAL_MS` (`30s`) and then issuing one detail request each:

- `GET /api/events/1`: about `42ms` client-side, `39ms` backend log time
- `GET /api/apr/12`: about `46ms` client-side, `44ms` backend log time

Five warm samples after the non-blocking refactor:

- `GET /api/events/1`: average about `41.5ms`, range `38.6ms - 48.8ms`
- `GET /api/apr/12`: average about `35.3ms`, range `32.4ms - 38.2ms`

Compared with earlier local samples before this refactor:

- event detail commonly sat around `57ms - 69ms`, with slower samples around `80ms+`
- APR detail commonly sat around `56ms - 64ms`, with slower samples around `70ms+`

Interpretation:

- local improvement is visible but not dramatic because local maintenance workload is usually empty
- the key architectural gain is that response time is no longer coupled to request-tail outbox/job execution budget
- under real serverless latency and non-empty maintenance work, this decoupling should matter more than local empty-backlog measurements suggest

## Additional Maintenance Tick Findings

### 1. `/internal/maintenance/tick` can reproduce intermittent `500` locally

Sequential local `POST /internal/maintenance/tick` calls reproduced mixed outcomes:

- some requests returned `200`
- some requests returned `500`
- slow failing samples reached about `12s - 16s`

One captured failing body showed:

- `outbox.timedOut = true`
- `outbox.error = "External maintenance outbox tick timed out"`
- total request duration around `15.6s`

This is important because the configured outbox batch timeout is only `1000ms`, yet the actual request can still run far longer.

### 2. Current timeout wrapper does not cancel the underlying DB work

`withTimeout()` uses `Promise.race()` and rejects after the budget, but it does not cancel the database query underneath.

Implication:

- a timed-out outbox batch can keep running in the background
- the maintenance request can still remain busy much longer than the configured timeout
- follow-up work in the same request can be delayed by the still-running DB operation

### 3. Maintenance endpoint currently has inconsistent failure signaling

Captured local `200` responses sometimes still contained:

- `outbox.stoppedReason = "ERROR"`
- `jobs = null`
- `jobsError = ""`

The controller currently decides `500` via truthy checks on `summary.outbox.error` / `summary.jobsError`.

Implication:

- real failures with empty-string messages can be reported as `200`
- monitoring based only on status code can undercount some failure cases
- the endpoint summary is more trustworthy than the HTTP status under the current implementation

### 4. Local environment became DB-unhealthy later in the session

Later local backend stderr showed repeated:

- `ECONNREFUSED 127.0.0.1:5436`

After that point, normal DB-backed routes such as `/api/events/1` and `/api/apr/12` also returned `500`, so any maintenance failure samples collected after that DB outage are not suitable for judging the endpoint's steady-state production behavior.

This means the useful local evidence is:

- maintenance tick instability was already reproduced before the local DB outage
- later all-route failures indicate an additional local environment problem, not a maintenance-endpoint-only bug

### 5. FC logs point more strongly to outbox-side latency than jobs-side latency

Observed production/staging-style backend logs:

- multiple `/internal/maintenance/tick` requests returned `500` at about `1s`
- rare slower failures reached about `9s`
- occasional healthy runs still returned `200` in about `57ms`

Inference:

- the repeated `500 1s` pattern aligns almost exactly with `OUTBOX_TICK_BATCH_TIMEOUT_MS = 1000`
- the healthy `200 57ms` path is consistent with an empty or fast outbox tick
- the rare `500 9s` path is consistent with timeout not cancelling the underlying DB work, so some requests keep paying extra tail time after the logical timeout

### 6. Outbox scan path currently has no supporting index, unlike jobs

Current schema state:

- `jobs` has explicit indexes for its claim path
- `outbox_events` currently has no secondary index for `status = 'PENDING' order by id asc`

This matters because `processOutboxBatch()` claims rows via:

- `where status = 'PENDING'`
- `order by id asc`
- `for update skip locked`
- `limit ...`

Inference:

- as `outbox_events` accumulates completed rows, the pending-row claim query can become increasingly expensive
- in FC + VPC DB conditions, this makes the current `1000ms` timeout especially likely to trip
- missing outbox index is now a primary root-cause candidate for the repeated `500 1s` maintenance failures

## Implemented Follow-Up Patch

### A. Added a partial index for the outbox pending-claim path

Implemented:

- schema-level partial index on `outbox_events(id) where status = 'PENDING'`
- forward migration `0015_outbox_pending_claim_idx.sql`

Expected effect:

- shrink the scan cost for the worker claim query
- reduce the chance that maintenance tick spends most of its budget finding pending rows
- specifically target the observed `500 1s` pattern without changing outbox semantics

### B. External maintenance tick now skips when another tick is already in flight in the same process

Implemented:

- module-level in-flight guard for external maintenance tick execution
- `/internal/maintenance/tick` now returns a skip summary instead of starting overlapping work in the same backend process

Expected effect:

- reduce self-amplified overlap from repeated timer or retry hits landing on the same warm instance
- avoid stacking multiple expensive outbox scans inside one process

Current validation boundary:

- backend build passed
- `db:lint` passed with the new migration
- local runtime did not naturally reproduce an `IN_FLIGHT` skip response because the current local maintenance path was failing too quickly to create a stable overlap window

Residual risks still not solved by this patch:

- JS timeout still does not cancel the underlying DB query
- maintenance endpoint failure signaling still relies on truthy string checks
- cross-instance overlap is still possible because the new skip is process-local rather than DB-global
