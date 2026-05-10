# Slice 2: Minimal Mounted Questionnaire Contract

## Objective

Define the smallest stable contract for post-event feedback questionnaires before implementation.

## Product Shape

Post-event feedback is a questionnaire capability. PR is an integration consumer of that capability.

Configuration source order:

1. PR-owned questionnaire instance pointer.
2. Questionnaire instance materialized from the Anchor Event questionnaire template pointer at PR creation time.
3. Legacy default willingness question for attendance-module PRs whose mounted custom config is empty.

Anchor Event stores a questionnaire template pointer. The selected template owns the questionnaire definition. PR creation materializes that template into a feedback questionnaire instance when the PR type resolves to an Anchor Event, matching the intended shared materialization principle for event-owned PR defaults. The PR stores the questionnaire instance id. Later Admin PR updates change the PR's questionnaire instance pointer.

## Template And Instance Model

Working draft:

- `FeedbackQuestionnaireTemplate`
  - reusable questionnaire definition
  - source selected by Anchor Event
  - can be cloned/materialized into instances
- `FeedbackQuestionnaireInstance`
  - concrete mounted questionnaire target
  - owns the frozen or overridden question config used for submission validation
  - can be referenced by PR or future integration consumers
- `FeedbackQuestionnaireResponse`
  - one submitted answer set for a questionnaire instance
  - stores answers and submitter identity / response key
  - can be upserted to preserve future editability
- `AnchorEvent.feedbackQuestionnaireTemplateId`
  - event-side pointer to a reusable feedback questionnaire template
  - source for PR creation materialization
- `PartnerRequest.feedbackQuestionnaireInstanceId`
  - PR-side pointer to one feedback questionnaire instance
  - surfaced on PR detail as the mounted questionnaire for the PR UI flow

## Command Contract

Check-in and feedback are separate backend commands.

Working draft:

- `POST /api/pr/:id/check-in`
  - records attendance
  - transitions the participant slot to `ATTENDED`
  - accepts attendance input only
- `POST /api/feedback/:id`
  - belongs to the feedback/questionnaire capability
  - treats `id` as a feedback questionnaire instance id
  - validates answers against the referenced questionnaire instance
  - persists or updates a `FeedbackQuestionnaireResponse`
  - leaves PR participation, attendance, and partner-slot ownership gating to PR integration

Frontend owns the user-facing PR flow composition. For a participant who taps `我已到场`, frontend can call check-in first, then submit the questionnaire response as the second command. The PR UI integration controls when the feedback form appears.

Any PR-specific projection, such as keeping `partners.would_join_again` aligned with a legacy willingness answer, belongs to the PR integration layer around the questionnaire submission. The generic feedback command should stay questionnaire-owned.

## Admin Contract

Anchor Event template selection and PR pointer override both need editing surfaces.

- Anchor Event admin edits the event's questionnaire template pointer.
- Admin PR page updates the PR's questionnaire instance pointer.
- Result viewing and export stay outside this phase.

## Resubmission Policy

Participant-facing edit entry stays outside this phase. Backend response persistence should still allow an update path that later edit support can reuse.

Working storage rule:

- template stores reusable definition
- instance stores the mounted definition snapshot
- response stores each submitted answer set

## Minimal Questionnaire Config

Working draft:

```ts
type FeedbackQuestionnaireDefinition = {
  key: string;
  version: string;
  title: string;
  questions: PostEventFeedbackQuestion[];
};

type PostEventFeedbackQuestion =
  | {
      id: string;
      type: "single_choice";
      label: string;
      required: boolean;
      options: Array<{
        value: string;
        label: string;
        requires?: Array<{
          questionId: string;
        }>;
      }>;
    }
  | {
      id: string;
      type: "textarea";
      label: string;
      required: boolean;
      maxLength: number;
    }
  | {
      id: string;
      type: "image_upload";
      label: string;
      required: boolean;
      purpose: "feedback";
    };
```

## Minimal Answer Shape

Working draft:

```ts
type PostEventFeedbackAnswers = Record<
  string,
  | { type: "single_choice"; value: string }
  | { type: "textarea"; value: string }
  | { type: "image_upload"; imageUrl: string }
>;
```

## Legacy Projection

If the PR-integrated questionnaire includes a stable willingness question, the PR integration layer can map it to `partners.would_join_again`.

Working convention:

- question id: `would_join_again`
- accepted values:
  - `yes` maps to `true`
  - `no` maps to `false`

## Food-Tasting Example

Working draft:

```json
{
  "key": "food_tasting_feedback",
  "version": "1",
  "title": "餐饮试吃反馈",
  "questions": [
    {
      "id": "taste_result",
      "type": "single_choice",
      "label": "这次试吃体验如何？",
      "required": true,
      "options": [
        {
          "value": "recommend",
          "label": "好吃，愿意推荐",
          "requires": [{ "questionId": "xiaohongshu_screenshot" }]
        },
        {
          "value": "needs_improvement",
          "label": "不好吃，想写建议",
          "requires": [{ "questionId": "improvement_note" }]
        }
      ]
    },
    {
      "id": "xiaohongshu_screenshot",
      "type": "image_upload",
      "label": "小红书截图",
      "required": false,
      "purpose": "feedback"
    },
    {
      "id": "improvement_note",
      "type": "textarea",
      "label": "哪里不好吃或有哪些改进建议？",
      "required": false,
      "maxLength": 1000
    }
  ]
}
```

## Contract Questions To Resolve Before Execute

- What respondent identity should the generic feedback command persist: current authenticated user/session, explicit response key, or both?
- Should response uniqueness be `questionnaireInstanceId + submitter identity`, or include an integration subject such as PR/partner slot?
- Where should the PR integration perform future legacy `wouldJoinAgain` projection if that mapping is enabled: a PR-side wrapper around feedback submission, a domain event from feedback submission, or a follow-up PR command triggered by frontend?
- Should every PR creation path resolve Anchor Event by type and materialize event-owned PR defaults, including support resources, join gates, and questionnaire instance?
- Should Admin PR override choose from existing instances, create a new instance from a selected template before updating the pointer, or support both paths?
- Should Admin PR override use a dedicated endpoint such as `PATCH /api/admin/prs/:id/feedback-questionnaire-instance`?
- What PR detail fields should represent feedback state for retry after check-in succeeds and feedback submission fails?
- What upload purpose name should be used for feedback images: `feedback`, `pr-feedback`, or an Anchor Event scoped purpose?

## Promotion Candidates

- Product behavior belongs in `docs/10-prd/behavior/workflows.md` and `docs/10-prd/behavior/rules-and-invariants.md`.
- API and upload contracts belong in `docs/20-product-tdd/cross-unit-contracts.md`.
- State ownership belongs in `docs/20-product-tdd/system-state-and-authority.md`.
