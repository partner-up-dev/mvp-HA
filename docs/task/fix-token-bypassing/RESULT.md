# RESULT - Fix Token Bypassing in `apps/frontend`

## Status

In progress.

The architecture prerequisite is complete enough to resume broad token migration against stabilized owners in:

- `apps/frontend/src/domains/*`
- `apps/frontend/src/shared/*`
- `apps/frontend/src/pages/*`
- `apps/frontend/src/processes/*`

The token work is no longer targeting retired legacy buckets.

## Progress by Phase

### Phase 0 - Audit by Decision Type

Completed for the first broad batch.

Audited hotspots included:

- landing surfaces in `src/pages/HomePage.vue` and `src/domains/landing/ui/sections/*`
- support/admin entry surfaces in `src/pages/ContactSupportPage.vue` and `src/pages/AdminLoginPage.vue`
- PR/admin detail surfaces were also scanned as remaining follow-up hotspots

Observed bypass patterns:

- local `color-mix(...)` decisions for surface tinting and borders
- local `clamp(...)` decisions for spacing and type scaling
- ad hoc action/button geometry in page and section styles
- local panel widths and max-heights
- page-level adaptive spacing rules duplicated outside the design-system layer

### Phase 1 - Build the Decision System

Completed for the first migration wave.

Implemented:

- [\_dcs.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/styles/_dcs.scss)
- [\_recipes.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/styles/_recipes.scss)
- `dcs` emission in [index.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/styles/index.scss)
- `dcs-var()` in [\_functions.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/styles/_functions.scss)
- recipe forwarding in [\_mixins.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/styles/_mixins.scss)

Current `dcs` coverage now includes:

- landing section spacing and panel spacing
- landing hero measurements and adaptive spacing
- panel widths for page-level shells
- page-hero typography
- expandable-panel max height

Current recipe coverage now includes:

- page shell
- pill badge
- pill action
- field shell
- admin-login surface panel
- shared surface card
- shared admin/subtle panel shells
- shared selection card

### Phase 2 - Migrate Shared Primitives First

Completed.

Earlier shared-primitives work landed before this broader resumption:

- page scaffold primitives were migrated to consume shared layout recipes
- shared button/action foundations were introduced so surfaces stop encoding their own basic CTA geometry

This phase moved forward further in the latest pass.

New shared treatment promotion completed:

- shared section-card shell promoted into [\_recipes.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/styles/_recipes.scss) via `pu-surface-card(section)`
- shared inset/high card shell promoted via `pu-surface-card(inset-high)`
- smaller inline CTA sizing promoted into the shared pill-action recipe via the `small` size
- transparent outlined small inline CTA profile promoted via `outline-transparent`
- admin workspace panel shell promoted via `pu-surface-panel(admin-workspace)`
- subtle inset panel shell promoted via `pu-surface-panel(subtle-inset)`
- compact surface field shell promoted via `pu-field-shell(compact-surface)`
- shared selection-card shell promoted via `pu-selection-card(...)`
- shared rectangular action shell promoted via `pu-rect-action(...)`
- shared form-control shell promoted via `pu-form-control(...)`

First downstream consumers switched to the promoted shared treatments:

- [Button.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/shared/ui/actions/Button.vue)
- [TabBar.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/shared/ui/navigation/TabBar.vue)
- [AdminNavigationCard.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/admin/ui/composites/AdminNavigationCard.vue)
- [MyPRsPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/MyPRsPage.vue)
- [PRFactsCard.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/pr/ui/composites/PRFactsCard.vue)
- [CommunityPRPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/CommunityPRPage.vue)
- [AnchorPRPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/AnchorPRPage.vue)
- [AdminAnchorPRPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/AdminAnchorPRPage.vue)
- [AdminBookingSupportPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/AdminBookingSupportPage.vue)
- [PRForm.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/pr/ui/forms/PRForm.scss)
- [DateTimeRangePicker.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/pr/ui/forms/DateTimeRangePicker.vue)
- [PRInput.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/pr/ui/forms/PRInput.vue)
- [PinInput.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/shared/ui/forms/PinInput.vue)
- [SharedPRActionsBar.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/pr/ui/sections/SharedPRActionsBar.vue)
- [AnchorAttendancePanel.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/pr/ui/sections/AnchorAttendancePanel.vue)
- [PRCreateFooterActions.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/pr/ui/sections/PRCreateFooterActions.vue)
- [UpdatePRStatusModal.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/pr/ui/modals/UpdatePRStatusModal.vue)

Phase 2 also included a correction pass:

- several premature `dcs` aliases were removed
- thin recipe wrappers over direct `sys` usage were removed
- `dcs` was kept for real layout/adaptive decisions such as landing clamps, panel widths, and a few page-level measures
- shared recipes were kept only where they encode real governed logic or stable shared treatments

Phase 2 is now considered complete because the reusable shared treatment families needed by downstream pages are in place:

- surface panels and cards
- pill actions
- selection cards
- field shells
- form controls
- rectangular actions

The remaining local styling in shared/domain UI is now mostly component-internal or page-specific rather than a missing shared primitive family.

### Phase 3 - Migrate High-Bypass Surfaces

Completed for the planned hotspot batch.

Completed migration batch:

- [HomePage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/HomePage.vue)
- [LandingHeroSection.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/landing/ui/sections/LandingHeroSection.vue)
- [LandingValuePropsSection.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/landing/ui/sections/LandingValuePropsSection.vue)
- [LandingFooterSection.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/landing/ui/sections/LandingFooterSection.vue)
- [LandingBookmarkNudge.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/landing/ui/sections/LandingBookmarkNudge.vue)
- [ContactSupportPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/ContactSupportPage.vue)
- [AdminLoginPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/AdminLoginPage.vue)
- [CommunityPRPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/CommunityPRPage.vue)
- [AnchorPRPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/AnchorPRPage.vue)
- [AnchorPRBookingSupportPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/AnchorPRBookingSupportPage.vue)
- [AdminAnchorPRPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/AdminAnchorPRPage.vue)
- [AdminBookingSupportPage.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/pages/AdminBookingSupportPage.vue)
- [PRShareCarousel.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/share/ui/composites/PRShareCarousel.vue)
- [ShareAsLink.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/share/ui/methods/as-link/ShareAsLink.scss)
- [ShareToWechatChat.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/share/ui/methods/wechat/ShareToWechatChat.scss)
- [ShareToXiaohongshu.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/share/ui/methods/xhs/ShareToXiaohongshu.scss)
- [WechatChatPreview.vue](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/domains/share/ui/primitives/WechatChatPreview.vue)

What changed in this batch:

- repeated landing `clamp(...)` outputs were promoted into `dcs`
- repeated pill/button geometry was centralized in recipes
- repeated field shell styling was centralized in recipes
- page-level panel widths/max-heights moved out of local styles into governed outputs
- direct dashed-border tint logic was simplified to governed surface vars where appropriate
- remaining PR/admin page-local rem font sizes, spacing literals, and ad hoc card/button shells were replaced with direct `sys` typography/spacing or existing shared recipes
- booking-support detail cards and reimbursement prompts were aligned to existing shared surface/action treatments instead of local shells
- share-method action shells, preview text, and card surfaces were aligned to direct `sys` typography/spacing plus the existing rect/pill/form recipes

Residual follow-up surfaces:

- non-hotspot pages such as `EventPlazaPage.vue` and `AnchorEventPage.vue` if we decide to continue beyond the original batch
- any future authenticated admin surfaces added later without reusing the migrated patterns

### Phase 4 - Document the Governance Model

Partially completed.

Completed:

- the plan already reflects the refined architecture: unified `dcs` decision system plus recipes
- the plan already records source-of-truth, theme/state axis, optional component-token layer, and the decision-invention vs structural-composition rule

Still pending:

- durable runtime docs in frontend source, especially:
  - `apps/frontend/src/styles/TOKEN-GOVERNANCE.md`
  - `apps/frontend/src/styles/AGENTS.md`
  - any final frontend AGENTS updates once the migration shape stabilizes further

### Phase 5 - Add Automated Guardrails

Not started.

Guardrails are intentionally deferred until the token architecture and first migration batches are stable enough to enforce.

## Token-System Corrections Landed Along the Way

While migrating the first broad batch, a pre-existing system-layer mismatch was fixed in [\_sys.scss](f:/CODING/Project/Anana/mvp-HA/apps/frontend/src/styles/_sys.scss).

The following `sys` variables are now emitted instead of being referenced as missing semantics:

- `--sys-color-surface-container-high`
- `--sys-color-on-surface-container`
- `--sys-color-on-secondary-container`
- `--sys-color-on-tertiary-container`
- `--sys-color-on-error-container`

This was necessary to keep the token stack internally coherent before adding more recipes on top.

## Validation Log

Build validation passed after the latest migration batch:

- `pnpm --filter @partner-up-dev/frontend build`

Browser validation passed against `http://localhost:4001/` using `agent-browser` for:

- `/`
- `/contact-support`
- `/admin/login`
- `/cpr/new` in natural-language mode
- `/cpr/new` in structured-form mode
- `/cpr/1`
- `/apr/2`
- `/apr/2/booking-support`
- `/pr/mine`
- authenticated `/admin/anchor-pr`
- authenticated `/admin/booking-support`

Validation intent:

- confirm landing hero/actions/footer/bookmark nudge still render correctly
- confirm support actions still render as intended after pill recipe adoption
- confirm admin login card, fields, and submit action still render correctly after panel/field/action recipe adoption
- confirm PR create inputs, advanced toggle, footer actions, and status modal still render correctly after form-control and rectangular-action recipe adoption
- confirm PR detail section cards and inline actions still render correctly after shared surface-card promotion
- confirm PR booking-support detail cards and reimbursement prompt still render correctly after replacing page-local shells with shared surface treatments
- confirm share carousel, WeChat preview, link sharing, and Xiaohongshu actions still render after the share-surface cleanup
- confirm admin anchor and booking-support workspaces render after the page-level cleanup using the seeded admin account

Authenticated admin validation used:

- Admin UUID: `00000000-0000-0000-0000-000000000001`
- Admin PIN: `admin123`

## Current Assessment

Execution rule clarified during implementation:

- use direct `sys` tokens when they are already an adequate semantic fit and do not cause a severe visual regression
- add new `dcs` outputs only when the existing token set does not adequately represent the governed decision
- keep recipes only for governed logic or stable shared treatments, not as a default replacement for direct `sys` composition

This rule has already been applied by simplifying premature `dcs` additions and removing thin recipe wrappers such as the earlier stack-gap and CTA helpers.

The token migration is now moving in the right direction:

- architecture ownership is stable enough that token governance can attach to real owners
- `dcs` now covers actual governed outputs, not just one page-shell primitive
- recipes now centralize governed logic without becoming a second token-emission system
- the first high-traffic landing/support/admin entry surfaces are no longer carrying as much local decision-making

The migration is not fully done because governance docs and automated guardrails are still pending, but the planned Phase 3 hotspot batch is now migrated and runtime-validated.

## Recommended Next Slice

Next migration slice:

1. Phase 4 governance docs in frontend source
2. optional follow-up cleanup for lower-priority pages such as `EventPlazaPage.vue` and `AnchorEventPage.vue`
3. Phase 5 automated guardrails

Approach for that slice:

- keep Phase 2 primitives fixed unless a real missing family is discovered
- keep using direct `sys` first, then `dcs` or recipes only when the decision truly needs central ownership
- focus next on documentation and enforcement rather than another abstraction wave
