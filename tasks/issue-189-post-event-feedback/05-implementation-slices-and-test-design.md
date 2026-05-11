# Implementation Slices And Scenario Test Design

## Readiness

The implementation can start after the user explicitly says start.

The current stable decisions are enough to begin:

- ship check-in bug fix first
- build feedback questionnaire as an independent capability
- split template, instance, and response
- Anchor Event points to template
- PR points to instance
- PR creation materializes event-owned defaults when PR type resolves to Anchor Event
- Admin PR override updates the PR instance pointer
- feedback submission uses `POST /api/feedback/:instanceId`
- result admin browser/export stays outside this phase

Working implementation assumptions for this phase:

- response uniqueness is `questionnaireInstanceId + current user id`
- PR feedback retry is driven by PR detail feedback projection
- Admin PR pointer override uses a dedicated endpoint
- feedback image upload purpose is `feedback`
- minimal template management can use seeded/migrated templates plus admin pointer selection

## Slice 1: Check-In Bug Fix

Scope:

- `ATTENDED` viewer receives `canCheckIn = false`
- PR contextual action stops rendering the check-in CTA for submitted attendance
- existing `wouldJoinAgain` write path remains intact

Backend test design:

- Arrange a PR with Anchor participation policy and an event start time in the past.
- Join and confirm a participant.
- Submit `POST /api/pr/:id/check-in` with `wouldJoinAgain = true`.
- Assert partner slot has:
  - `status = ATTENDED`
  - `didAttend = true`
  - `wouldJoinAgain = true`
- Fetch `GET /api/pr/:id`.
- Assert viewer has:
  - `slotState = ATTENDED`
  - `canCheckIn = false`
  - `checkInBlockedReason = ALREADY_CONFIRMED` or a new completed reason if introduced.

System scenario design:

- Extend `tests/scenario/pr-core/pr-detail-participation.scenario.test.ts`.
- Browser reaches PR detail as confirmed participant after event start.
- Assert `pr-detail.participant.check-in-action` is visible.
- Click check-in, submit willingness.
- Assert `pr-detail.participant.check-in-action` disappears after refresh/cache invalidation.

## Slice 2: Durable Contract Docs

Scope:

- PRD: attendance follow-up can mount a questionnaire.
- Product TDD: feedback route, template/instance/response state, PR detail projection, admin pointer override, upload purpose.
- Authority doc: backend ownership of template, instance, response, Anchor Event pointer, PR pointer.

Verification:

- Docs mention template/instance/response separately.
- Docs state PR UI owns participation gating while feedback route validates questionnaire answers.
- Docs state PR create materializes event-owned defaults when PR type resolves to Anchor Event.

## Slice 3: Feedback Core Backend

Scope:

- Add entities:
  - `feedback_questionnaire_templates`
  - `feedback_questionnaire_instances`
  - `feedback_questionnaire_responses`
- Add repositories for CRUD and response upsert.
- Add definition and answer schemas.
- Add `POST /api/feedback/:instanceId`.
- Add `feedback` image upload purpose.
- Mount controller and export needed frontend types.

Backend test design:

- Given a questionnaire instance with food-tasting definition.
- Submit valid answers through `POST /api/feedback/:instanceId`.
- Assert one response row stores answers, submitter id, submitted/updated timestamp.
- Submit again for same user and instance.
- Assert response is updated through the same uniqueness key.
- Submit invalid conditional answers:
  - recommend without screenshot
  - needs_improvement without improvement note
- Assert route rejects with a stable validation error.

## Slice 4: Unified PR Creation Materialization

Scope:

- Resolve Anchor Event by PR type during PR creation.
- Materialize join gates, support resources, and questionnaire instance from the resolved event defaults.
- Cover public structured create, event-assisted create, admin create, and auto-expansion.
- Store `partner_requests.feedback_questionnaire_instance_id`.
- Store `anchor_events.feedback_questionnaire_template_id`.

Backend scenario design:

- Anchor Event has support resource template, join gate config, and feedback questionnaire template.
- Create PR through public structured create with matching type.
- Assert PR has materialized join gate config, support resources, and questionnaire instance.
- Create PR through Admin PR create with matching type.
- Assert same materialization behavior.
- Trigger auto-expansion from a full PR.
- Assert new sibling PR has its own questionnaire instance and event-owned support resources/join gates.
- Create PR with type that has no Anchor Event.
- Assert questionnaire instance pointer is null and creation still succeeds.

## Slice 5: Admin Surfaces

Scope:

- Anchor Event admin workspace exposes available questionnaire templates and selected template id.
- Anchor Event create/update can save template pointer.
- Admin PR workspace exposes current questionnaire instance pointer.
- Dedicated Admin PR command updates instance pointer.
- Admin PR UI provides minimal pointer override entry.

Backend/admin test design:

- Create or update Anchor Event with a template id.
- Assert workspace returns selected template id.
- Patch Admin PR questionnaire instance pointer.
- Assert PR row points to selected instance.
- Assert general PR content update preserves existing questionnaire instance pointer.

Frontend test design:

- Focused component or page test if available:
  - Admin Anchor Event saves template pointer.
  - Admin PR override calls dedicated mutation and refreshes admin workspace.

## Slice 6: PR Detail Feedback Integration

Scope:

- `GET /api/pr/:id` includes mounted questionnaire projection and current viewer response state.
- PR UI renders a questionnaire modal/flow after check-in when mounted feedback is pending.
- Check-in and feedback remain separate commands.
- If feedback submit fails after check-in succeeds, PR detail still offers retry via feedback projection.
- Current hardcoded `wouldJoinAgain` flow can remain for PRs without mounted questionnaire during migration.

System scenario design:

- Food-tasting Anchor Event has questionnaire template.
- Create PR with matching type and join/confirm participant.
- Move event into started state.
- Browser clicks `我已到场`.
- Frontend submits check-in, then shows questionnaire.
- Choose `好吃，愿意推荐`, upload/attach screenshot answer, submit.
- Assert feedback success state appears and check-in CTA stays gone.
- Backend probe asserts:
  - partner slot is `ATTENDED`
  - questionnaire response exists under PR's mounted instance
- Failure/retry scenario:
  - simulate invalid feedback submission after successful check-in
  - assert PR detail shows retry affordance for pending feedback
  - submit valid feedback
  - assert response persists

## Slice 7: Final Verification

Commands:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm test:scenario backend`
- `pnpm test:scenario system` for the PR detail browser journey if the scenario is added in this phase

Acceptance:

- Check-in CTA bug is fixed and verified.
- `wouldJoinAgain` persistence has regression coverage.
- Feedback questionnaire has template, instance, and response persistence.
- PR creation materializes questionnaire instance from Anchor Event template across the relevant creation paths.
- Admin PR override updates only the PR instance pointer.
- PR detail can recover from check-in success plus feedback failure.
