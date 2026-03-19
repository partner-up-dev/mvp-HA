# RESULT - Fix Frontend Architectural Mismatch in `apps/frontend`

## Status

Phase 6 is materially completed.

Phases 1-4 are completed for the PR slice and validated in the running app.
Phase 5 completed the remaining planned domain and shared-query migrations for:

- share
- event
- admin
- residual PR/share query ownership
- residual cross-domain config / poi / wechat reminder query ownership

Phase 6 completed the final cleanup seam:

- landing surface sections moved out of `widgets/home`
- platform/app workflows moved out of top-level `composables`
- retired legacy buckets are now governed centrally in `src/ARCHITECTURE.md`
- the now-empty legacy directories have been physically removed

## Completed Work

### Phase 1 - Taxonomy and Governance

Completed:

- added architecture governance in `apps/frontend/src/ARCHITECTURE.md`
- updated frontend guidance in `apps/frontend/AGENTS.md`
- updated `apps/frontend/src/components/AGENTS.md` so component guidance reflects the new ownership model

Outcome:

- the repo now has a documented primary taxonomy:
  - `app`
  - `shared`
  - `domains`
  - `processes`
  - `pages`

### Phase 2 - New Backbone

Completed:

- established new roots under:
  - `apps/frontend/src/app`
  - `apps/frontend/src/domains`
  - `apps/frontend/src/shared/ui`
- updated style auto-injection so the new roots receive the same SCSS infrastructure as legacy folders

Outcome:

- new work can land directly in the target structure instead of adding more ambiguous modules to legacy buckets

### Phase 3 - Shared Primitive Cleanup

Completed:

- replaced fake shared primitives with actual shared UI under `src/shared/ui`
- moved shared layout shells into `src/shared/ui/layout`
- removed duplicated legacy files from:
  - `components/common`
  - `widgets/common`
- moved PR-specific visual modules out of generic buckets into `domains/pr/ui/*`

Examples:

- `Button`
- `Modal`
- `TabBar`
- `PageHeader`
- `LoadingIndicator`
- `ErrorToast`
- `PinInput`
- `PageScaffold*`
- `PRHeroHeader`
- `PRFactsCard`
- `PRStatusBadge`
- `PRShareSection`
- `AnchorPRActionsBar`
- `CommunityPRActionsBar`

Outcome:

- shared UI now mostly means true shared primitives
- PR-specific UI no longer hides inside `components/common`, `components/pr`, or `widgets/pr`

### Phase 4 - PR Domain Vertical Migration

Completed:

- moved PR routing/model ownership under `domains/pr`
- moved PR forms and modals under `domains/pr/ui/*`
- moved PR create/action orchestration under `domains/pr/use-cases/*`
- moved core PR queries under `domains/pr/queries/*`
- moved the home inline natural-language PR entry into PR domain UI and renamed it to remove `home` semantics
- removed deprecated or dead PR-entry surface files

Examples:

- `domains/pr/model/*`
- `domains/pr/routing/*`
- `domains/pr/queries/useAnchorPR.ts`
- `domains/pr/queries/useCommunityPR.ts`
- `domains/pr/use-cases/useSharedPRActions.ts`
- `domains/pr/use-cases/useAnchorAttendanceActions.ts`
- `domains/pr/use-cases/useCommunityPRCreateFlow.ts`
- `domains/pr/ui/forms/*`
- `domains/pr/ui/modals/*`
- `domains/pr/ui/sections/InlineNLPRForm.vue`
- `domains/pr/ui/sections/PRCreateHeader.vue`
- `domains/pr/ui/sections/PRCreateFooterActions.vue`

Removed legacy categories for this slice:

- `entities/pr/*`
- `widgets/pr/*`
- `widgets/pr-create/*`
- `components/pr/*`
- `features/pr-actions/*`
- `features/pr-create/*`
- top-level `queries/useAnchorPR.ts`
- top-level `queries/useCommunityPR.ts`

Outcome:

- the PR slice now largely obeys the intended domain-first structure end to end

### Phase 5 - Share Slice Migration

Completed in this turn:

- moved generic share model/UI/use-case files under `domains/share/*`
- moved PR-specific share-context building under `domains/pr/use-cases/usePRShareContext.ts`
- updated poster-generation composables to use the new share template locations
- removed legacy share files from:
  - `components/share/*`
  - `features/share/*`

Examples:

- `domains/share/model/types.ts`
- `domains/share/ui/composites/PRShareCarousel.vue`
- `domains/share/ui/methods/as-link/*`
- `domains/share/ui/methods/wechat/*`
- `domains/share/ui/methods/xhs/*`
- `domains/share/ui/primitives/WechatChatPreview.vue`
- `domains/share/ui/templates/*`
- `domains/share/use-cases/useShareCarousel.ts`
- `domains/share/use-cases/as-link/useShareAsLink.ts`
- `domains/share/use-cases/wechat/useShareToWechatChat.ts`
- `domains/share/use-cases/xhs/useShareToXiaohongshu.ts`
- `domains/share/use-cases/xhs/shareToXiaohongshuUtils.ts`
- `domains/pr/use-cases/usePRShareContext.ts`

Outcome:

- generic sharing mechanics now have an explicit share-domain owner
- PR-specific share payload assembly stays with the PR domain instead of being hidden in a top-level `features/share` bucket

### Phase 5 - Event Slice Migration

Completed:

- moved event queries under `domains/event/queries/*`
- moved event UI primitives under `domains/event/ui/primitives/*`
- moved home event-entry sections under `domains/event/ui/sections/landing/*`
- updated the home page, event plaza page, and anchor-event page to consume domain-owned event modules
- removed legacy event files from:
  - `components/event/*`
  - event-specific `widgets/home/*`
  - top-level `queries/useAnchorEvents.ts`
  - top-level `queries/useAnchorEventDetail.ts`
  - dead V2 home-event support files under `widgets/home/*`
  - `composables/useHomeEventUnitData.ts`

Examples:

- `domains/event/queries/useAnchorEvents.ts`
- `domains/event/queries/useAnchorEventDetail.ts`
- `domains/event/ui/primitives/EventCard.vue`
- `domains/event/ui/primitives/AnchorEventPRCard.vue`
- `domains/event/ui/sections/landing/EventHighlightsSection.vue`
- `domains/event/ui/sections/landing/EventPlazaEntry.vue`

Outcome:

- event ownership is now explicit instead of split across top-level queries, `components/event`, and home widgets
- home event entry is no longer disguised as generic home-widget ownership when it is really event-domain entry UI

### Phase 5 - Admin Slice Migration

Completed:

- moved admin login query, admin management queries, and booking-support queries under `domains/admin/queries/*`
- moved admin navigation UI under `domains/admin/ui/composites/*`
- moved admin access orchestration under `domains/admin/use-cases/*`
- updated admin route pages to consume domain-owned admin modules
- removed legacy admin ownership from:
  - top-level admin queries
  - `components/admin/*`
  - `composables/useAdminAccess.ts`

Examples:

- `domains/admin/queries/useAdminLogin.ts`
- `domains/admin/queries/useAdminAnchorManagement.ts`
- `domains/admin/queries/useAdminBookingSupport.ts`
- `domains/admin/ui/composites/AdminNavigationCard.vue`
- `domains/admin/use-cases/useAdminAccess.ts`

Outcome:

- admin-specific behavior no longer leaks through generic top-level query/composable buckets
- admin pages remain route entrypoints, while admin domain modules now own admin data access, access control, and admin-only UI composition

### Phase 5 - Residual Share and PR Query Cleanup

Completed:

- moved share HTML/caption-generation queries under `domains/share/queries/*`
- moved "my PRs" queries under `domains/pr/queries/*`
- updated share use-cases and `MyPRsPage.vue` to consume the new domain-owned query homes

Examples:

- `domains/share/queries/useGenerateWechatThumbHtml.ts`
- `domains/share/queries/useGenerateXhsPosterHtml.ts`
- `domains/share/queries/useGenerateXiaohongshuCaption.ts`
- `domains/pr/queries/useMyCreatedPRs.ts`
- `domains/pr/queries/useMyJoinedPRs.ts`

Outcome:

- the share slice no longer depends on top-level share query files
- the `pr-mine` page now reads from PR-owned query modules instead of ambiguous global queries

### Phase 5 - Shared Cross-Domain Query Cleanup

Completed:

- moved public-config queries under `shared/config/queries/*`
- moved POI lookup queries under `shared/poi/queries/*`
- moved WeChat reminder-subscription queries under `shared/wechat/queries/*`
- updated contact pages, event pages, PR pages, and booking-support pages to consume those shared owners
- deleted the dead `features/pr-detail/*` files instead of preserving an unused legacy feature bucket

Examples:

- `shared/config/queries/usePublicConfig.ts`
- `shared/poi/queries/usePoisByIds.ts`
- `shared/wechat/queries/useWeChatReminderSubscription.ts`
- `shared/wechat/queries/useUpdateWeChatReminderSubscription.ts`

Outcome:

- top-level `src/queries/*` no longer owns live query hooks
- cross-domain infrastructure now has explicit homes under `shared/*`
- the top-level `features/*` bucket has no remaining live files in this migration scope

## Validation Completed

### Build

Confirmed repeatedly:

- `pnpm --filter @partner-up-dev/frontend build`

Build currently passes after the PR slice migration.

Known remaining warning:

- existing Vite chunk-size warning

### Browser Validation

Validated with `agent-browser` against `http://localhost:4001/`.

Confirmed working:

- `/`
  - home page loads
  - the inline natural-language PR entry expands and shows the textbox/action controls
- `/cpr/new`
  - natural-language mode renders
  - structured mode renders
- `/cpr/1`
  - community PR detail renders and share controls mount
- `/apr/2`
  - anchor PR detail renders and share controls mount
- `/apr/2/booking-support`
  - booking-support page renders its main content

Observed caveats during validation:

- `/apr/1` previously stayed loading and produced repeated 404s in the running environment
- `/apr/2/booking-support` previously showed 401s for some auth-gated data while the main page still rendered

Interpretation:

- those caveats looked data/auth-environment specific, not architectural regressions caused by the migration itself

Additional validation after share migration:

- no remaining `@/components/share` or `@/features/share` imports in `apps/frontend/src`
- build still passes after the share-domain move
- browser revalidation confirmed `/cpr/1` still mounts the share controls after the migration

Additional validation after event migration:

- no remaining imports from:
  - `@/queries/useAnchorEvents`
  - `@/queries/useAnchorEventDetail`
  - `@/components/event`
  - the removed home-event widget cluster
- browser validation confirmed:
  - `/` still renders the event highlight/entry surface
  - the home event-plaza entry still links to `/events`
  - `/events` renders correctly
  - `/events/2` renders correctly

Additional validation after admin migration:

- browser validation confirmed unauthenticated route-guard behavior still works:
  - `/admin/anchor-pr` redirects to `/admin/login?redirect=/admin/anchor-pr`
  - `/admin/booking-support` redirects to `/admin/login?redirect=/admin/booking-support`
- browser validation confirmed `/admin/login` still renders and surfaces backend login errors
- the running local environment rejected the documented seeded admin credentials with `Invalid admin credentials`, so a fully authenticated post-migration admin-page render could not be validated in this environment

Additional validation after residual PR/share query cleanup:

- no remaining imports from:
  - `@/queries/useGenerateWechatThumbHtml`
  - `@/queries/useGenerateXhsPosterHtml`
  - `@/queries/useGenerateXiaohongshuCaption`
  - `@/queries/useMyCreatedPRs`
  - `@/queries/useMyJoinedPRs`
- browser validation confirmed `/pr/mine` still renders, including the anonymous-state hint and empty-state sections

Additional validation after shared cross-domain query cleanup:

- no remaining imports from:
  - `@/queries/usePublicConfig`
  - `@/queries/usePoisByIds`
  - `@/queries/useWeChatReminderSubscription`
  - `@/queries/useUpdateWeChatReminderSubscription`
  - `@/features/pr-detail`
- browser validation confirmed:
  - `/contact-support` still renders its contact actions
  - `/contact-author` still renders
  - `/events/2` still renders
  - `/cpr/1` still renders
  - `/apr/2` still renders
  - `/apr/2/booking-support` still renders

### Phase 6 - Landing and Workflow Re-Homing

Completed:

- moved landing-only sections out of `widgets/home/*` into `domains/landing/*`
- moved app/platform workflows out of top-level `composables/*` into:
  - `processes/auth/*`
  - `processes/wechat/*`
  - `shared/motion/*`
  - `shared/upload/*`
  - `shared/wechat/*`
  - `domains/share/use-cases/poster/*`
- removed dead legacy files:
  - `widgets/home/HomeContactEntry.vue`
  - `composables/useRotatingTextWithTypeWriter.ts`
- consolidated retirement guidance into `src/ARCHITECTURE.md` instead of keeping duplicate shadow docs

Examples:

- `domains/landing/ui/sections/LandingHeroSection.vue`
- `domains/landing/ui/sections/LandingValuePropsSection.vue`
- `domains/landing/ui/sections/LandingBookmarkNudge.vue`
- `domains/landing/ui/sections/LandingFooterSection.vue`
- `domains/landing/use-cases/useLandingBookmarkNudge.ts`
- `domains/landing/use-cases/useLandingRotatingTopic.ts`
- `processes/auth/useAuthSessionBootstrap.ts`
- `processes/wechat/useAutoWeChatLogin.ts`
- `processes/wechat/requireWeChatActionAuth.ts`
- `processes/wechat/useRouteWeChatShare.ts`
- `shared/motion/useInViewStagger.ts`
- `shared/upload/useCloudStorage.ts`
- `shared/wechat/useWeChatShare.ts`
- `domains/share/use-cases/poster/renderHtmlPoster.ts`

Outcome:

- `widgets/home` and top-level `composables` no longer own live product code
- landing-surface ownership is explicit instead of being hidden behind route-semantic widget names
- app-level bootstrapping and platform workflows now live under `processes/*` or `shared/*`, which makes their responsibility legible
- empty legacy directories under `components`, `widgets`, `features`, and `entities` no longer remain in the tree

Additional validation after Phase 6 landing/workflow moves:

- `pnpm --filter @partner-up-dev/frontend build` still passes
- browser validation confirmed:
  - `/` still renders, and the inline NL entry still expands from the landing section
  - `/cpr/new` still renders
  - `/cpr/1` still renders
  - `/apr/2` still renders
  - `/contact-support` still renders

## Current State of Legacy Taxonomy

The following ambiguity has been materially reduced:

- `components/common`
- `components/pr`
- `widgets/common`
- `widgets/pr`
- `widgets/pr-create`
- `features/pr-actions`
- `features/pr-create`
- `entities/pr`
- top-level PR query ownership
- top-level event query ownership
- top-level admin query ownership
- top-level share query ownership
- top-level public-config / poi / wechat reminder query ownership
- dead `features/pr-detail/*`
- live ownership inside `widgets/home/*`
- live ownership inside top-level `composables/*`

The following areas still remain for later phases:

- broader auth/session-bootstrap ownership
- retirement or freezing of remaining ambiguous top-level buckets after migration coverage is sufficient

## Next Recommended Step

Resume token-system migration on top of the stabilized ownership model.

Recommended next work:

- tighten import guardrails so retired buckets cannot be reintroduced
- resume broad token-system migration on top of the stabilized ownership model
