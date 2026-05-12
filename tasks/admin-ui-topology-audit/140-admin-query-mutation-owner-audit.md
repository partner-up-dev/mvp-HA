# Slice 7 - Admin Query / Mutation Ownership Audit

## Objective & Hypothesis

- Objective: map current Admin query, mutation, draft, and layout ownership after the scaffold stabilization work.
- Hypothesis: the routes with the largest maintenance risk are the routes where page/view components still own both `BentoLayout` orchestration and business resource state.

## Guardrails Touched

- Typed input: `Constraint`
- Active mode: `Explore` -> `Solidify`
- Durable owner:
  - Admin route entrypoints under `apps/frontend/src/pages`
  - Admin UI modules under `apps/frontend/src/domains/admin/ui`
  - Admin use-cases under `apps/frontend/src/domains/admin/use-cases`

## Owner Matrix

| Surface | Current Route / View | Current Query Owner | Current Mutation Owner | Draft / Dirty Owner | Boundary Status | Next Slice |
| --- | --- | --- | --- | --- | --- | --- |
| Anchor Event | `AdminAnchorEventPage.vue` + `anchor-event/sections/**` | section / use-case split exists | section / use-case split exists | anchor-event section inputs | mostly repaired | follow-up polish only |
| Feedback Questionnaires | `AdminFeedbackQuestionnairesPage.vue` | route page | route page | route page JSON draft | acceptable low-risk page, layout repaired | no immediate split |
| Support Resource Config | `AdminBookingSupportPage.vue` | route page via `useAdminSupportResourceConfig` | route page via `replaceResources` | route page editable resources | layout repaired, business owner still in page | Slice 8 |
| Support Resource Execution | `AdminBookingExecutionPage.vue` | route page via `useAdminSupportResourceExecution` | route page via submit / release commands | route page per-PR drafts | layout repaired, business owner still in page | Slice 8 |
| POI Basic | `AdminPoisPage.vue` | route page via `useAdminPois` / `useAdminPoiEditor` | route page via editor save | route page / use-case editor | page still owns Bento cards and business content | Slice 9 |
| POI Review | `AdminPoisPage.vue` | route page | route page via `useAdminPoiActions` | none beyond selected POI | page still owns review card and actions | Slice 9 |
| PR Basic | `AdminPRPage.vue` -> `AdminPRBasicView.vue` | route view via `useAdminPRWorkspaceSelection` | route view + PR use-cases | route view form draft | large view still owns shell, Bento, filters, query, draft, commands | Slice 10 |
| PR Messages | `AdminPRPage.vue` -> `AdminPRMessagesView.vue` | route view via workspace selection and `useAdminPRMessages` | route view via message actions | route view message composer / edit draft | large view still owns shell, Bento, filters, query, draft, commands | Slice 10 |
| Retained PR Messages Page | `AdminPRMessagesPage.vue` | retained standalone page | retained standalone page | retained standalone page | obsolete compatibility surface | Slice 11 |

## Post Slice 11 Update

| Surface | Updated Owner State |
| --- | --- |
| Support Resource Config | `AdminBookingSupportPage.vue` assembles shell and Anchor Event selection; `SupportResourceConfigSection.vue` owns config query, draft resources, validation, and save command. |
| Support Resource Execution | `AdminBookingExecutionPage.vue` assembles shell and search rail state; `SupportResourceExecutionSection.vue` owns execution query, per-PR drafts, submit command, and release command. |
| POI | `AdminPoisPage.vue` assembles shell and active section; `useAdminPoiManagementWorkspace` owns POI query, mutation, selection, dirty editor, and review commands; `PoiBasicSection.vue` and `PoiReviewSection.vue` own Bento card allocation and business UI. |
| PR Basic / Messages | `AdminPRBasicView.vue` and `AdminPRMessagesView.vue` now use `AdminPageScaffold` and shared `PRFilterRail.vue`; fine-grained PR form/message components remain as follow-up work. |
| Retained PR Messages Page | Standalone `AdminPRMessagesPage.vue` was removed; `/admin/pr-messages` remains a redirect to `admin-pr`. |

## Ownership Decisions

- Route pages should assemble route shell, global navigation, header, and current section.
- Section orchestrators should own `BentoLayout`, `BentoItem`, card titles, card descriptions, and shared action placement.
- Business components should own resource-specific content and local query / mutation where the API surface is resource-scoped enough to be meaningful.
- Coarse backend endpoints should remain hidden behind feature use-cases until backend API split becomes valuable.
- Page-level `BentoLayout` usage remains a smell unless the page is a deliberately small single-resource screen.

## Ordered Implementation

1. Support Resource:
   - extract config and execution section orchestrators
   - move config query / mutation and draft ownership into config business component
   - move execution query / mutation and per-PR drafts into execution business component
2. POI:
   - extract basic and review section orchestrators
   - keep `useAdminPoiEditor` as dirty draft owner
   - move review commands to a review business component or a narrow review use-case
3. PR:
   - keep `AdminPRPage.vue` as section resolver
   - reduce PR basic/messages views into shell-level assemblies
   - move message query/mutation into PR message business components
4. Cleanup:
   - remove or document retained compatibility pages
   - clean obsolete locale keys and trailing whitespace

## Verification

- Concrete files and symbols were inspected through `rg`.
- Slice 6 typecheck passed before this audit was written.
