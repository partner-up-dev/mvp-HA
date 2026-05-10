# Global Pre-Implementation Review

## Objective

Re-check the full issue #189 shape before implementation starts, with the current decisions:

- first ship the check-in bug fix plus a minimal custom questionnaire system
- feedback questionnaire is a capability parallel to PR
- questionnaire splits template and instance
- Anchor Event points to a questionnaire template
- PR points to a questionnaire instance
- PR creation materializes an instance from the Anchor Event template
- Admin PR override updates the PR instance pointer
- check-in and feedback are separate backend commands composed by the frontend
- generic feedback submission uses `POST /api/feedback/:id`, where `id` is a questionnaire instance id

## Global Model

The model that stays coherent is:

```text
FeedbackQuestionnaireTemplate
  -> reusable definition and validation shape

AnchorEvent
  -> feedbackQuestionnaireTemplateId

PR creation when type resolves to Anchor Event
  -> materialize FeedbackQuestionnaireInstance from template
  -> PartnerRequest.feedbackQuestionnaireInstanceId

PartnerRequest
  -> mounted feedbackQuestionnaireInstanceId

POST /api/feedback/:instanceId
  -> validate answers against instance
  -> persist or update FeedbackQuestionnaireResponse
```

This keeps questionnaire ownership in feedback/questionnaire, event default selection in Anchor Event, and mounted execution in PR integration.

## Surfaces Found

Backend surfaces:

- `apps/backend/src/entities/*.ts`: new questionnaire entities, Anchor Event template pointer, PR instance pointer.
- `apps/backend/drizzle/`: schema migration generated from Drizzle entities.
- `apps/backend/src/index.ts`: mount feedback controller and export frontend-facing types.
- `apps/backend/src/controllers/partner-request.controller.ts`: existing check-in route and PR detail route.
- `apps/backend/src/controllers/admin-anchor-management.controller.ts`: Anchor Event template pointer and Admin PR pointer override payloads.
- `apps/backend/src/controllers/upload.controller.ts`: image purpose allowlist if feedback images use shared upload.
- `apps/backend/src/infra/storage/image-storage.service.ts`: add `feedback` purpose and prefix if selected.
- `apps/backend/src/domains/pr-core/services/partner-section-view.service.ts`: check-in CTA read-model bug.
- `apps/backend/src/domains/pr/read-models/get-pr-detail.ts`: expose mounted questionnaire instance projection.
- `apps/backend/src/domains/anchor-event/use-cases/create-event-assisted-pr.ts`: materialize questionnaire instance after PR create.
- `apps/backend/src/domains/anchor-event/use-cases/expand-full-pr.ts`: auto-created sibling PR needs an instance policy.
- `apps/backend/src/domains/admin-anchor-management/use-cases/create-admin-pr.ts`: manually-created Admin PR needs explicit pointer or type-derived materialization policy.
- `apps/backend/src/domains/admin-anchor-management/use-cases/create-admin-anchor-event.ts`: create Anchor Event template pointer.
- `apps/backend/src/domains/admin-anchor-management/use-cases/update-admin-anchor-event.ts`: update Anchor Event template pointer.
- `apps/backend/src/domains/admin-anchor-management/use-cases/get-admin-anchor-workspace.ts`: expose template pointer for admin UI.
- `apps/backend/src/domains/admin-anchor-management/use-cases/get-admin-pr-workspace.ts`: expose instance pointer and available templates/instances for admin UI.

Frontend surfaces:

- `apps/frontend/src/pages/PRPage.vue`: route assembly and action-success refresh.
- `apps/frontend/src/domains/pr/ui/sections/PRContextualActions.vue`: current check-in modal and future feedback renderer mount point.
- `apps/frontend/src/domains/pr/use-cases/usePRAttendanceActions.ts`: check-in command wrapper.
- `apps/frontend/src/domains/pr/queries/usePRActions.ts`: existing PR mutations; feedback should use a feedback-owned query module.
- `apps/frontend/src/shared/api/query-keys.ts`: feedback and admin cache keys.
- `apps/frontend/src/pages/AdminAnchorEventPage.vue`: Anchor Event template pointer UI.
- `apps/frontend/src/pages/AdminPRPage.vue`: PR instance pointer override UI.
- `apps/frontend/src/domains/admin/queries/useAdminAnchorEvents.ts`: Anchor Event admin input/response types inferred from RPC.
- `apps/frontend/src/domains/admin/queries/useAdminPRManagement.ts`: PR admin pointer override mutation and workspace response.

Docs and tests:

- `docs/10-prd/behavior/workflows.md`: reliability loop gains mounted questionnaire feedback after attendance.
- `docs/10-prd/behavior/rules-and-invariants.md`: questionnaire template/instance ownership and check-in absence semantics.
- `docs/10-prd/behavior/capabilities.md`: participant feedback capability.
- `docs/20-product-tdd/cross-unit-contracts.md`: feedback route, PR detail projection, admin contracts, upload purpose.
- `docs/20-product-tdd/system-state-and-authority.md`: template, instance, response, and pointer ownership.
- `tests/scenario/pr-core/pr-detail-participation.scenario.test.ts`: check-in CTA disappearance and persistence proof.
- New backend scenario or focused route tests for feedback response persistence and materialization.

## Ordering Review

Recommended implementation order:

1. Check-in bug fix and verification.
2. Durable docs for questionnaire ownership and API contract.
3. Backend feedback core: template, instance, response schema, repository, route, validation.
4. PR creation materialization: one mechanism for Anchor Event resolved by PR type, covering support resources, join gates, and questionnaire instance.
5. Admin UI: Anchor Event template pointer, Admin PR instance pointer override.
6. PR UI: mounted questionnaire projection, renderer, check-in followed by feedback.
7. Verification pass: backend typecheck, frontend typecheck/build, scenario coverage.

This order lets the bug fix merge independently and lets the questionnaire system exist before PR consumes it.

## Open Design Gaps

1. Admin PR override creation path.
   The pointer override is clear. The operator still needs a practical way to obtain a target instance id. Minimal choices are an instance selector, a template-to-instance create action followed by pointer update, or both.

2. Respondent identity.
   The generic feedback route needs a durable response key. The PR flow can use the current session or authenticated user. A future public questionnaire may need explicit `respondentKey` or anonymous session continuity.

3. Response upsert uniqueness.
   Future editability depends on a stable uniqueness rule, likely `questionnaireInstanceId + respondent identity`. If anonymous submissions are allowed later, response identity needs a clear input.

4. Legacy `wouldJoinAgain` projection.
   The current bug slice can keep `POST /api/pr/:id/check-in` writing `partners.would_join_again`. The questionnaire route should remain generic. A future mapping from questionnaire answer to partner slot needs a PR integration command, event handler, or PR-side wrapper.

5. Partial success and retry.
   Check-in and feedback are separate commands. If check-in succeeds and feedback submission fails, the slot is already `ATTENDED`. PR detail needs enough feedback projection to offer a retry path for the mounted questionnaire, instead of relying only on the check-in CTA.

6. Admin PR override command shape.
   Admin PR override should use a dedicated PR questionnaire instance pointer command or a clearly isolated field. Mixing pointer replacement into the broad PR content update path would make accidental rematerialization and unclear cache invalidation more likely.

7. Auto-expanded PR policy.
   `expand-full-pr.ts` creates sibling PRs from an existing full PR. It should go through the same event-resolved PR materialization behavior so each sibling PR receives event-owned support resources, join gates, and its own questionnaire instance.

8. Admin-created PR policy.
   `create-admin-pr.ts` creates a PR by type and time. If the type maps to an Anchor Event, PR creation should materialize event-owned defaults the same way as other creation paths. If the admin wants a different questionnaire, the Admin PR pointer override can cover it after create.

9. Image upload purpose.
   Current allowlist has `poster`, `poi`, `anchor-event-cover`, and `anchor-event-beta-group-qr`. Food-tasting screenshot upload needs a new purpose if we store uploaded images through the existing service. `feedback` is the cleanest generic name unless operations need event-scoped directories.

10. Template management breadth.
   The current admin pages can select pointers, but a template authoring surface is a separate system. Minimal implementation can seed or migrate one food-tasting template and expose pointer selection. A full template builder belongs outside this slice.

## Risk Review

- Contract risk: adding `/api/feedback/:id` means backend `AppType` changes and frontend RPC types move together.
- Data risk: schema migration touches PR and Anchor Event rows plus three new feedback-owned tables.
- UX risk: the current check-in modal is a binary follow-up. Food-tasting feedback adds branching and image upload, so mobile layout and loading states need a real renderer instead of page-local conditionals.
- Authority risk: feedback route staying generic means PR eligibility must be expressed by PR UI integration and PR read-model affordances, including retry affordances after partial success.
- Test risk: materialization has multiple creation paths; event-assisted create, auto-expansion, and admin create need separate proof or an explicitly scoped policy.

## Current Conclusion

The main missing pieces before implementation are respondent identity, response upsert key, feedback retry state, Admin PR override instance acquisition and command shape, unified PR creation materialization for event-owned defaults, and the exact image upload purpose. The core ownership model is stable enough to implement after those choices are resolved or scoped.
