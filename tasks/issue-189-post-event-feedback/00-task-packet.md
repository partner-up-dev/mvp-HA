# Issue 189 Post-Event Feedback And Check-In

## Objective & Hypothesis

Handle GitHub issue #189 by separating the existing check-in feedback bug from the new post-event feedback questionnaire capability.

Hypothesis:

- The existing PR Page check-in bug can be fixed locally by making the backend PR partner-section read model expose an already-submitted check-in as completed, and by keeping the frontend primary CTA aligned with that state.
- The existing `wouldJoinAgain` value is already persisted on the partner slot, so the bug slice should verify persistence and CTA disappearance before expanding the model.
- A minimal custom questionnaire system should treat post-event feedback as a questionnaire capability parallel to PR. PR depends on and integrates with the questionnaire capability.
- Questionnaire responses should be persisted by the feedback/questionnaire system. The existing `partners.would_join_again` column can remain for the current check-in command and as an optional PR integration projection if a later flow maps a stable questionnaire answer back to the partner slot.
- This task should stay split across documents and implementation slices to avoid turning the PR page or a single task note into a monofile.

## Current Confirmed Scope

- First implementation target: bug fix plus minimal custom questionnaire system.
- Questionnaire configuration owner: feedback questionnaire template, selected by Anchor Event.
- PR override: allowed as a PR questionnaire instance pointer override.
- Template / instance split: feedback questionnaire has reusable templates and materialized instances. PR points to one feedback questionnaire instance.
- Materialization model: PR creation should apply one event-context materialization mechanism whenever the PR type resolves to an Anchor Event, independent of whether the caller is public, event-assisted, admin, or auto-expansion. Anchor Event stores a questionnaire template pointer. PR creation materializes that template into a feedback questionnaire instance, and PR stores the instance pointer. Admin PR override updates the PR instance pointer.
- Command model: check-in and feedback are two backend commands; frontend owns composing them into one user-facing flow. Feedback submission uses a feedback-owned API such as `POST /api/feedback/:id`.
- Validation model: feedback submission itself is generic; PR participation gating lives in the PR UI integration.
- Feedback edit policy: participant-facing edit entry stays out of this phase, while backend persistence should allow an upsert/update path that later edit support can reuse.
- PR override admin entry: in scope for the existing Admin PR page.
- Result review/export: out of scope for this phase.
- Admin-facing result browser/export: out of scope for this phase.

## Input Classification

- `Reality`: PR Page currently continues to show `我已到场` after the viewer submits check-in feedback.
- `Reality`: `wouldJoinAgain` appears to be submitted through the existing RPC and persisted to `partners.would_join_again`; this needs verification coverage.
- `Intent`: activity-specific post-event feedback should become a configurable questionnaire capability.
- `Constraint`: questionnaire is a parallel capability that PR integrates with as a consumer.
- `Constraint`: Anchor Event points to questionnaire template; PR points to questionnaire instance.
- `Constraint`: PR override is pointer-level: update the PR's questionnaire instance pointer.
- `Constraint`: questionnaire materialization should mirror the intended PR creation mechanism for support resources and join gates: if PR type resolves to an Anchor Event, event-owned defaults materialize onto the PR at creation time.

## Mode Plan

- `Diagnose`: prove the current check-in state mismatch and persistence behavior.
- `Solidify`: promote the minimal questionnaire product and technical contracts after discussion stabilizes.
- `Execute`: implement the bug fix first, then the minimal questionnaire slice.

## Guardrails Touched

- Product owner: `docs/10-prd/behavior/workflows.md`, `docs/10-prd/behavior/rules-and-invariants.md`, and likely `docs/10-prd/behavior/capabilities.md` for post-event feedback behavior.
- Cross-unit contract owner: `docs/20-product-tdd/cross-unit-contracts.md` for PR detail feedback instance projection, check-in command payload shape, feedback command API, upload purpose, questionnaire template/instance shapes, and PR instance pointer behavior.
- Authority owner: `docs/20-product-tdd/system-state-and-authority.md` for questionnaire template state, questionnaire instance state, Anchor Event questionnaire template pointer, PR questionnaire instance pointer, and feedback response persistence.
- Backend surfaces:
  - `apps/backend/src/domains/pr-core/services/partner-section-view.service.ts`
  - `apps/backend/src/domains/pr-core/use-cases/check-in.ts`
  - `apps/backend/src/controllers/partner-request.controller.ts`
  - feedback/questionnaire entities, controllers, repositories, and use cases.
  - PR / Anchor Event entities and repositories for Anchor Event template pointers and PR instance pointers.
- Frontend surfaces:
  - `apps/frontend/src/domains/pr/ui/sections/PRContextualActions.vue`
  - `apps/frontend/src/domains/pr/use-cases/usePRAttendanceActions.ts`
  - `apps/frontend/src/domains/pr/queries/usePRActions.ts`
  - PR detail feedback modal / questionnaire renderer to be added under the PR domain.
- Verification surfaces:
  - `tests/scenario/pr-core/pr-detail-participation.scenario.test.ts`
  - Backend PR-core scenario tests for response persistence and read-model action state.

## Current Evidence

- PR Page route assembles `PRContextualActions`.
- `PRContextualActions` shows the `CHECKIN_ATTENDED` primary action for `slotState === "CONFIRMED" || slotState === "ATTENDED"`.
- `usePRAttendanceActions.submitCheckIn(wouldJoinAgain)` sends `wouldJoinAgain` to the Hono RPC client.
- `POST /api/pr/:id/check-in` accepts `wouldJoinAgain`.
- `checkIn` calls `PartnerRepository.reportCheckIn`.
- `PartnerRepository.reportCheckIn` sets `status = "ATTENDED"`, `didAttend = true`, and `wouldJoinAgain = payload.wouldJoinAgain`.
- `buildPRPartnerSection` currently leaves `canCheckIn` true for participants after event start while `ATTENDED` represents an already-submitted check-in.
- GitHub issue #189 is open, labeled `domain:pr`, assigned to `xiaoland`, has no discussion comments, and still describes the same two-part scope: hide the check-in CTA after attendance submission, verify `wouldJoinAgain` persistence, and add configurable post-event feedback for food tasting.
- Existing support-resource materialization path:
  - `apps/backend/src/domains/anchor-event/use-cases/create-event-assisted-pr.ts` calls `materializePRSupportResources` after `createPRFromStructured`.
  - `apps/backend/src/domains/pr-booking-support/services/materialize-pr-support-resources.ts` resolves event templates and replaces PR-owned support resources by PR id.
  - The questionnaire integration should use the same event-default-to-instance materialization principle while keeping submission owned by feedback/questionnaire.

## Proposed Slice 1: Existing Check-In Bug

Address and Object:

- Backend PR partner-section read model check-in availability.
- Frontend PR detail contextual primary CTA.
- Scenario coverage for check-in persistence and CTA disappearance.

State Diff:

- From: `ATTENDED` participants can still receive `canCheckIn = true` and the PR Page can keep rendering `我已到场`.
- To: after a successful check-in, the viewer has `slotState = "ATTENDED"`, `canCheckIn = false`, persisted feedback is verified, and the primary check-in CTA disappears.

Invariants:

- `ATTENDED` remains an active participant state for roster/capacity purposes.
- Absence of check-in remains the unknown state.
- Check-in remains available only for PRs with the participation policy and after event start.
- Existing `wouldJoinAgain` submissions remain accepted.

Verification:

- Backend scenario or existing probe asserts `status`, `didAttend`, and `wouldJoinAgain` after check-in.
- Browser scenario asserts the check-in CTA disappears after successful submission.
- Relevant frontend/backend build or type checks pass.

## Proposed Slice 2: Minimal Mounted Questionnaire System

Address and Object:

- Feedback/questionnaire capability model and submission API.
- Feedback questionnaire template model and definition validation.
- Feedback questionnaire instance model.
- Feedback questionnaire response model for each submitted answer set.
- Anchor Event questionnaire template pointer.
- PR-level questionnaire instance pointer.
- Admin PR override UI for the PR questionnaire instance pointer.
- Feedback-owned response persistence keyed by questionnaire/submission target.
- PR detail projection for the mounted questionnaire instance state.
- PR detail frontend modal that renders a minimal questionnaire.

State Diff:

- From: post-check-in follow-up is hardcoded to one `wouldJoinAgain` boolean question.
- To: post-event feedback is a PR-integrated questionnaire instance with a minimal schema, materialized from an Anchor Event template at PR creation, referenced by PR detail, and submitted through a feedback-owned command that frontend runs after check-in when needed.

Minimal Schema Direction:

- Questionnaire config:
  - `key`
  - `version`
  - `title`
  - `questions`
- Question types:
  - `single_choice`
  - `textarea`
  - `image_upload`
- Conditional requirements should be minimal and explicit, enough for the food-tasting flow:
  - selected choice may require an image upload answer
  - selected choice may require a textarea answer

Persistence Direction:

- Add feedback-owned response persistence. Each submitted questionnaire answer set belongs in a response record; the questionnaire instance stores the mounted question definition snapshot, not the participant's answer payload.
- Add feedback questionnaire templates and instances.
- Add PR questionnaire instance pointer, populated from Anchor Event template materialization during PR creation and replaceable through Admin PR pointer override.
- Keep `partners.would_join_again` as an optional integration projection when the PR flow submits a legacy willingness answer.
- Store uploaded image URLs as answer values after the existing upload service returns a URL.

Invariants:

- Backend remains authoritative for questionnaire templates, questionnaire instances, Anchor Event template pointers, PR instance pointers, and response persistence.
- Frontend renders the backend-provided config and follows questionnaire rules from backend data.
- Frontend may orchestrate `check-in` followed by `feedback`, but each backend command keeps a single responsibility and a separate route family.
- PR participation gating lives in PR integration; feedback submission stays generic.
- User-facing feedback edit entry is out of scope, but backend persistence can upsert/update to preserve future editability.
- Admin result viewing and export stay outside this phase.
- Generic survey builder breadth stays limited to the food-tasting and legacy willingness cases.

Verification:

- Backend scenario proves any PR creation path whose type resolves to an Anchor Event materializes the Anchor Event template to a questionnaire instance that PR points to, and PR pointer override wins when present.
- Admin PR scenario or focused frontend coverage proves the PR override entry can update the PR's questionnaire instance pointer.
- Backend scenario proves feedback-owned response submission persists answers through `POST /api/feedback/:id`.
- PR integration scenario proves the composed PR flow preserves the current check-in persistence behavior and can later project a stable questionnaire willingness answer when that mapping is enabled.
- Frontend scenario covers one minimal food-tasting branch if implementation cost stays bounded.
- Existing check-in and PR detail participation scenarios continue to pass.

## Open Questions

- What upload purpose name should be used for feedback images: `feedback`, `pr-feedback`, or an Anchor Event scoped purpose?
- Should Admin PR override choose from existing instances, create a new instance from a selected template before updating the pointer, or support both paths?
- Should questionnaire submission identify the respondent by current authenticated user/session, an explicit response key, or both?
- Should feedback responses be keyed by `questionnaireInstanceId + submitter identity`, or should the model also include an integration subject such as PR/partner slot for future consumers?
- Where should a future legacy `wouldJoinAgain` projection live if the generic feedback command remains questionnaire-owned?
- How should PR detail expose feedback retry state when check-in succeeds but questionnaire submission fails?
- Should Admin PR pointer override use a dedicated command instead of being folded into general PR content update?

## Discussion Log

- 2026-05-10: Initial issue review found the existing CTA bug and confirmed `wouldJoinAgain` is already written to `partners.would_join_again`.
- 2026-05-10: User confirmed initial scope: bug fix plus minimal custom questionnaire system; Anchor Event owns the event-level questionnaire selection and PR override is allowed; result admin view/export is out of scope.
- 2026-05-10: User decided check-in and feedback should be two commands composed by the frontend; participant-facing feedback edit entry stays out of this phase while persistence remains mechanically updateable; PR override needs an Admin PR page entry; PR override should follow the support-resource materialization pattern at PR creation time.
- 2026-05-10: User clarified post-event-feedback is fundamentally a questionnaire feature parallel to PR. PR depends on that feature through UI integration. Feedback submission should use a feedback-owned route such as `POST /api/feedback/:id`, with PR participation gating owned by PR UI integration.
- 2026-05-10: User confirmed feedback questionnaire should split template and instance. PR points to one feedback questionnaire instance, and `POST /api/feedback/:id` should target that instance.
- 2026-05-10: User clarified Admin PR override is a PR instance-pointer override. Anchor Event points to questionnaire template, while PR points to questionnaire instance.
- 2026-05-10: Global review narrowed Anchor Event storage to a questionnaire template pointer; the template owns the questionnaire definition, and PR owns the materialized instance pointer.
- 2026-05-10: GitHub issue #189 was re-checked through GitHub; the issue remains open with no comments and no newer scope changes beyond the body.
- 2026-05-10: Subagent review highlighted four P1 risks to preserve before implementation: feedback response identity/upsert key, materialization coverage across event-assisted create/auto-expansion/admin create, partial success retry when check-in succeeds and feedback fails, and Admin PR pointer override as a dedicated command or field.
- 2026-05-10: User clarified PR creation itself should own event-context materialization across public, admin, event-assisted, and auto-expansion paths. If PR type resolves to an Anchor Event, support resources, join gates, and questionnaire instance materialization should all come from the Anchor Event. User also called out that each submitted questionnaire needs response storage in addition to the questionnaire instance.
- 2026-05-10: Implementation readiness, slice plan, and scenario test design were recorded. Working assumptions: response uniqueness uses questionnaire instance plus current user, feedback retry state is exposed on PR detail, Admin PR pointer override uses a dedicated endpoint, feedback image purpose is `feedback`, and minimal template management can start from seeded/migrated templates plus pointer selection.
- 2026-05-10: User requested Slice 1 implementation and explicitly scoped out the check-in-after-submit scenario test. Slice 1 verification will use backend unit coverage plus type/build checks.
- 2026-05-10: Slice 2 durable docs updated PRD and Product TDD with mounted feedback questionnaires, template/instance/response ownership, `POST /api/feedback/:instanceId`, `feedback` image upload purpose, Admin PR pointer override endpoint, PR detail feedback projection, and unified PR create materialization by Anchor Event type.
- 2026-05-10: Slice 3 implemented feedback questionnaire templates, instances, responses, answer validation, `POST /api/feedback/:instanceId`, `feedback` image upload purpose, and PR detail feedback projection with current viewer submission state.
- 2026-05-10: Slice 4 unified event default materialization across public structured create, natural-language create, event-assisted create, Admin PR create, and auto-expansion. Anchor Event template pointers materialize into PR questionnaire instance pointers beside support resources and join-gates.
- 2026-05-10: Slice 5 added Admin Anchor Event template selection and Admin PR questionnaire instance pointer override through a dedicated endpoint.
- 2026-05-10: Slice 6 added frontend questionnaire rendering/submission, check-in-to-feedback orchestration, attended-state retry CTA, and a seeded food-tasting feedback template. Verification passed: `pnpm --filter @partner-up-dev/backend typecheck`, `pnpm --filter @partner-up-dev/backend test:unit`, `pnpm db:lint`, and `pnpm --filter @partner-up-dev/frontend build`.
- 2026-05-10: Slice 7 assigned backend scenario test writing to sub-agent Singer. Added backend feedback questionnaire scenario coverage for Anchor Event template materialization, feedback response upsert, and Admin PR instance-pointer override. Final verification passed: `pnpm --filter @partner-up-dev/backend typecheck`, `pnpm --filter @partner-up-dev/frontend build`, `pnpm db:lint`, `pnpm test:scenario backend`, and `pnpm test:scenario system`.
- 2026-05-10: User approved the next scope: add Feedback Questionnaire Admin. Minimal scope is template list/create/edit for title and definition JSON. Instance creation remains PR materialization-owned, Admin PR continues to own only PR instance pointer override, and result viewing/export remains out of scope. Initial implementation should use backend schema validation for JSON definition instead of a visual builder.
- 2026-05-10: Feedback Questionnaire Admin implemented. Backend Admin API now supports template list/create/update with schema validation and key/version uniqueness guards; frontend adds `/admin/feedback-questionnaires` with template selection, create/edit fields, and definition JSON editing. Test writing was delegated to sub-agent Lagrange, which added backend scenario coverage for create/list, update/list, and duplicate key/version conflicts. Verification passed: `pnpm test:scenario backend`, `pnpm --filter @partner-up-dev/backend typecheck`, and `pnpm --filter @partner-up-dev/frontend build`.

## Slices

- `01-check-in-bug.md`: diagnose and execute the existing check-in CTA and persistence verification slice.
- `02-questionnaire-contract.md`: solidify the minimal mounted questionnaire product and cross-unit contract.
- `03-questionnaire-implementation.md`: execute the minimal questionnaire persistence, API, and UI slice after contract confirmation.
- `04-global-review.md`: pre-implementation review of missed surfaces, risky assumptions, and implementation ordering.
- `05-implementation-slices-and-test-design.md`: executable slice breakdown and scenario test plan.
