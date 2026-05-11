# Slice 3: Minimal Questionnaire Implementation Notes

## Objective

Implement the minimal mounted questionnaire after Slice 2 contract decisions stabilize.

## Expected Backend Work

- Add a feedback/questionnaire capability with schema ownership for questionnaire config and responses.
- Add feedback questionnaire template persistence.
- Add feedback questionnaire instance persistence.
- Add feedback questionnaire response persistence for each submitted answer set.
- Add Anchor Event questionnaire template pointer persistence.
- Add PR questionnaire instance pointer persistence.
- Move toward one PR creation materialization mechanism for event-owned defaults: when PR type resolves to an Anchor Event, materialize support resources, join gates, and the effective Anchor Event questionnaire template into PR-owned state.
- Add Admin PR update support for replacing the PR's questionnaire instance pointer.
- Add feedback-owned response persistence.
- Add feedback-owned submit command, `POST /api/feedback/:id`, where `id` is a questionnaire instance id.
- Add PR read model projection on `GET /api/pr/:id` that exposes the mounted questionnaire instance to the PR UI.
- Keep legacy `wouldJoinAgain` compatibility as a PR integration projection around generic feedback behavior.

## Expected Frontend Work

- Add a PR-domain questionnaire modal/renderer.
- Use backend-provided mounted questionnaire instance.
- Compose the user-facing check-in flow from two commands when feedback is required:
  - submit check-in
  - submit feedback through the feedback API
- Support:
  - single choice
  - textarea
  - image upload
  - conditional required follow-up based on selected choice
- Add Admin PR page override UI for the PR's questionnaire instance pointer.
- Keep `PRContextualActions` as the assembly point and move questionnaire mechanics into dedicated PR-domain modules.

## Expected Tests

- Backend scenario for Anchor Event template materializing into a questionnaire instance.
- Backend scenario for feedback response persistence as separate storage from questionnaire instance.
- Backend scenario for PR pointing at the materialized questionnaire instance.
- Backend scenario for PR override winning over the materialized instance pointer.
- Backend scenario for Admin PR create using Anchor Event materialization when type resolves to an Anchor Event.
- Admin PR page or focused admin mutation coverage for saving the PR instance pointer override.
- Backend scenario for feedback-owned response persistence through the feedback route.
- PR integration coverage for composing check-in and feedback in the PR detail UI.
- Scenario or frontend-focused browser coverage for the food-tasting branch if implementation remains bounded.

## Deferred

- Admin result browser.
- Result export.
- Full survey builder.
- Cross-event analytics.
- Complex branching logic beyond selected-choice follow-up requirements.
