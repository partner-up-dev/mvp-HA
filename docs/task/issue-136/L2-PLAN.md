# L2 Plan (Reassessment Under New Direction)

## 1. New Direction To Evaluate

Based on the latest product direction, issue #136 should be reassessed as:

1. remove batch overrides
2. decouple support resources from Anchor Event
3. replace `anchor_event_support_resources` with a generic `support_resources` catalog
4. let Admin manually bind available resources to each Anchor PR
5. simplify the resource-support model rather than preserve the old event-template inheritance shape

This is a materially different plan from the earlier "event-level source of truth" path.

## 2. First-Principles Reframe

Under this new direction, the domain should stop treating support resources as:

- part of event configuration
- inherited by batch
- copied into PR

Instead, the cleaner split becomes:

### A. Resource catalog

Reusable support-resource definitions, independent from any one event.

### B. PR binding

An explicit admin decision that one Anchor PR uses some subset of those resources.

### C. Runtime effective view

Computed booking-support detail for public and admin reads, derived from:

- PR root time window
- PR status/context
- bound resources
- booking rule computation

This means the correct replacement for current `anchor_pr_support_resources` is not another snapshot table with copied business fields. It is a thin relation model plus runtime projection.

## 3. Why This Direction Can Be Cleaner

### 3.1 It removes two kinds of hidden inheritance

Current complexity comes from:

- event -> batch override inheritance
- event/batch -> PR materialization inheritance

Manual PR binding removes both.

### 3.2 It removes event-local configuration debt from the support domain

Current resource config is trapped inside one event. That makes reusable operational resources harder to manage.

Examples:

- 场地费
- 羽毛球
- 饮料
- 学习计时器

Those are conceptually reusable resource types, not necessarily one-event-only objects.

### 3.3 It aligns support with operational reality

If support is actually a manual operations decision, then modeling it as event-level inheritance is false automation.

In that case, explicit PR binding is more honest than template resolution.

## 4. The New Model Boundary That Must Be Kept Clean

This direction only stays maintainable if `support_resources` and `anchor_pr_resource_bindings` are not collapsed into one table.

### 4.1 `support_resources` should own reusable semantics only

Likely belongs here:

- stable code
- title
- resource kind
- default booking handling mode
- default settlement mode
- default cancellation policy
- default summary copy
- default detail rules

Likely should not belong here:

- event id
- batch id
- PR id
- location ids
- absolute booking deadline
- event-specific override copy

### 4.2 PR binding should own PR-local selection semantics

Likely belongs here:

- `pr_id`
- `support_resource_id`
- display order
- active / removed state if needed

Potentially belongs here only if product really needs it:

- per-PR notes
- per-PR enable/disable of booking-required behavior

Recommendation:

- start with selection-only binding
- do not reintroduce a wide override surface unless product explicitly needs it

Otherwise the model will regress into "PR snapshots under a new name".

## 5. Critical Consequences Of Decoupling From Anchor Event

### 5.1 `locationIds` should disappear from the resource catalog

Current `anchor_event_support_resources` contains:

- `appliesToAllLocations`
- `locationIds`

Those fields only make sense because the resource is nested under one event and its location pool.

If resources become global, those fields become wrong:

- they reference event-local location ids
- they are not reusable across events

So decoupling from Anchor Event is only coherent if location filtering stops being a resource-template concern.

Recommended consequence:

- remove location applicability from resource catalog
- let Admin choose resources directly on the specific PR instead

This is one of the strongest arguments in favor of your new direction.

### 5.2 Batch override should be removed, not renamed

Once resource selection happens at PR level, batch override no longer has a clean reason to exist.

Keeping it would produce three layers again:

- catalog
- batch override
- PR binding

That would be strictly worse than today.

### 5.3 PR creation flows lose automatic support assignment

This is the biggest product consequence.

The following creation paths currently end with support materialization:

- user-created Anchor PR
- admin-created Anchor PR
- full-PR auto expansion
- alternative-batch acceptance

Under the new direction, those PRs would now start with zero bound resources unless Admin binds them later.

That is not a bug. It is the real semantic change introduced by this model.

## 6. Main Risks In This Direction

### Risk A: operational burden replaces configuration inheritance

Every Anchor PR that needs support now needs a manual admin action.

Effects:

- more back-office work
- more chance of forgotten binding
- more need for clear empty-state monitoring

This is only acceptable if manual ops is intended product truth, not temporary fallback.

### Risk B: booking semantics can appear late

If Admin binds a booking-required resource after users already joined, the PR can suddenly gain:

- booking deadline
- booking contact requirement
- booking trigger eligibility
- reimbursement eligibility

This is higher-risk than the old model because support is no longer established at PR creation time.

Recommended guardrail:

- only allow resource binding edits while PR is `OPEN`

Stronger guardrail:

- only allow edits before any non-creator participant joins

### Risk C: user-created PR and auto-created PR lose event-level support defaults

Current event-level modeling lets the system create PRs with meaningful support automatically.

The new direction gives up that automation.

If product still expects "same event usually implies same support", then this direction may increase ops friction too much.

### Risk D: catalog copy must become more generic

Current event-bound resources and batch overrides contain copy like:

- "本场由平台统一协助预订"
- batch-specific booking deadline explanations

A global `support_resources` catalog cannot safely keep a lot of event- or batch-specific wording.

This means existing seed/admin data likely needs copy cleanup, not only schema migration.

## 7. Recommended Target Model

### 7.1 New core tables

Recommended durable shape:

1. `support_resources`
   - reusable resource catalog
2. `anchor_pr_support_bindings`
   - PR -> resource relation only

Avoid these anti-patterns:

- renaming `anchor_event_support_resources` to `support_resources` without removing event-local fields
- renaming `anchor_pr_support_resources` to bindings while still copying all business columns

### 7.2 Derived read model

Introduce one derived type like:

```ts
type EffectiveSupportResource = {
  bindingId: number;
  supportResourceId: number;
  title: string;
  resourceKind: ...;
  summaryText: string;
  detailRules: string[];
  displayOrder: number;
  booking: {
    required: boolean;
    handledBy: ...;
    deadlineAt: Date | null;
    locksParticipant: boolean;
    cancellationPolicy: string | null;
  };
  support: {
    settlementMode: ...;
    subsidyRate: number | null;
    subsidyCap: number | null;
    requiresUserTransferToPlatform: boolean;
  };
};
```

The key point:

- `deadlineAt` is computed per PR
- the rest mostly comes from resource catalog + binding order

## 8. Admin Surface Implications

### 8.1 `/admin/booking-support` should become catalog management, not event config

If this direction is accepted, this page should no longer be event-scoped or batch-scoped.

It should manage:

- create/edit/archive support resources
- generic resource defaults

It should stop managing:

- event resources
- batch overrides

### 8.2 `/admin/anchor-pr` becomes the real support-assignment workspace

Admin Anchor PR page should gain:

- available resource picker
- current bound resource list
- ordering controls if needed

This is the natural place because resource support becomes PR-level operations.

### 8.3 Workspace data shape must expand

`getAdminAnchorWorkspace()` currently returns only:

- PR summary
- booking triggered at
- effective booking deadline at

If binding moves into Admin Anchor PR, workspace will also need either:

- bound resource summaries inline, or
- a dedicated PR resource endpoint

Recommendation:

- use a dedicated PR resource endpoint

Reason:

- keep anchor workspace lightweight
- avoid returning full catalog payload for every PR in one giant workspace response

## 9. Booking Execution And Audit

Under this new direction, booking execution should not point to a copied PR snapshot row.

Recommended reference model:

- `target_binding_id` or `target_support_resource_id`

Preferred:

- `target_binding_id`

Reason:

- execution chooses from the resources bound to that PR
- binding preserves PR-specific order and selection history

Still keep immutable audit snapshot fields:

- `targetResourceTitle`
- contact phone used
- notification summary

If bindings can later be removed, audit row must remain readable without joining live tables.

## 10. Impact On Non-Admin Creation Paths

### 10.1 User-created Anchor PR

`createUserAnchorPR()` would no longer assign support automatically.

Needed decision:

- Is "new user-created PR starts without support" acceptable?

### 10.2 Auto-expanded Anchor PR

`expandFullAnchorPR()` currently clones context and materializes support.

Under the new direction:

- expanded PR starts without support unless admin later binds it

Needed decision:

- Is auto-expanded PR allowed to start support-empty even when source PR had support?

### 10.3 Alternative batch acceptance

`acceptAlternativeBatch()` currently materializes support into the newly created PR.

Under the new direction:

- newly created alternative PR also starts empty unless separately bound

This may be acceptable, but it must be intentional.

## 11. Recommendation After Further Evaluation

I think your new direction is technically coherent, but only in this stricter form:

1. create a global `support_resources` catalog
2. create a thin `anchor_pr_support_bindings` relation
3. remove event resource ownership entirely
4. remove batch overrides entirely
5. move support assignment to Admin PR operations
6. prohibit late support edits after PR passes an agreed lifecycle point

I do **not** recommend these half-measures:

- global `support_resources` but still keep location ids on the resource
- global `support_resources` but still keep batch overrides
- PR binding that copies all resource fields into a wide row

Those variants would preserve most of the current complexity while changing names.

## 12. Decision Gates Before Implementation

### Gate 1

Should newly created PRs be allowed to exist with zero support until Admin manually binds resources?

### Gate 2

What is the latest lifecycle point when Admin may edit PR resource bindings?

Recommended:

- only while PR is `OPEN`

### Gate 3

Should booking execution point to:

- PR binding id
- or global resource id

Recommended:

- PR binding id + immutable title snapshot

### Gate 4

Should `/admin/booking-support` survive as a catalog page, or should the entire support admin surface be merged into `/admin/anchor-pr`?

Recommended:

- keep `/admin/booking-support` for catalog management
- use `/admin/anchor-pr` for PR binding only

## 13. L2 Conclusion

This new direction can be cleaner than the earlier event-level authority plan, but only because it changes the product truth:

- support is no longer event configuration
- support becomes reusable operational inventory
- support assignment becomes explicit PR-level admin work

If that product truth is accepted, the maintainable model is:

- catalog table
- thin PR binding table
- derived effective read model

not another inheritance chain and not another snapshot table.
