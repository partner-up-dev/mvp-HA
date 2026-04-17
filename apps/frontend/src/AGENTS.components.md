# AGENTS.md for Frontend Components

## Component Development Norms

### Using Shared Types

Always import type definitions from `@partner-up-dev/backend` instead of re-declaring them:

```typescript
import type { PartnerRequestFields, PRId, PRStatus } from "@partner-up-dev/backend";

// ❌ Don't do this:
interface PartnerRequestFields { ... }

// ✅ Do this:
import type { PartnerRequestFields } from "@partner-up-dev/backend";
```

This ensures consistency across frontend and backend and reduces duplication.

### Using RPC Data

In components, destructure Vue Query returns (`data`, `isLoading`, `error`).

```vue
<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="user">
    <h1>{{ user.name }}</h1> <!-- Auto-completion here -->
    <p>{{ user.email }}</p>
  </div>
</template>

<script setup lang="ts">
import { useUser } from '@/domains/example/queries/useUser';
import { useRoute } from 'vue-router';

const route = useRoute();
// Assuming route param id
const { data: user, isLoading, error } = useUser(Number(route.params.id));
</script>
```

### Ownership

Use the architecture rules in `src/ARCHITECTURE.md`.

- True cross-domain UI primitives live under `src/shared/ui/*`.
- Domain-owned UI should move toward `src/domains/<domain>/ui/*`.
- Do not add new usage-specific components back into `components/common`.

### Styling

All components MUST follow `src/styles/AGENTS.md`.

Default rule:

- use direct `sys` tokens first
- do not add `dcs` or a component contract if existing `sys` already solves the need without a severe visual regression

Components may use existing shared primitives when the treatment is already centralized, but should not add a new primitive or variant just to hide ordinary `sys` usage.

Action treatments live inside the lowest action primitives:

- `shared/ui/actions/Button.vue`
- `shared/ui/actions/ActionLink.vue`

Pages, domain components, and higher-level shared components should compose `Button`, `ActionLink`, or `FeedbackButton` instead of re-declaring action treatment styles. Navigation components such as `TabBar` should own their navigation-specific styles directly instead of reusing action treatments.

Exception: explicitly exempted visual surfaces such as the Landing Page may keep treatment styles component-local when visual continuity matters. Do not push those one-off treatments into `dcs` or shared primitives just to satisfy reuse.

- Mixins are auto-injected by Vite config for all components, use them directly:
  - `@include mx.pu-font($key)` - Typography (e.g., `body-large`, `label-small`)
  - `@include mx.pu-elevation($level)` - Shadows (levels 1-5)
  - `@include mx.pu-icon($size)` - Icon sizing (`sm`, `md`, `lg`)

- CSS Variables prefixed with `--sys-`:
  - Colors: `--sys-color-primary`, `--sys-color-surface-container`, etc.
  - Spacing: `--sys-spacing-xs`, `--sys-spacing-med`, etc.
  - Radius: `--sys-radius-sm`, `--sys-radius-lg`, etc.

Learn available tokens in `src/styles/_sys.scss`, governance rules in `src/styles/AGENTS.md`, and low-level typography/elevation/icon mixins in `src/styles/_mixins.scss`.

Prohibited:

- ❌ Hardcoded colors, sizes, or font properties
- ❌ Adding a new component contract or `dcs` token when direct `sys` is already enough
- ❌ Direct imports of token files (`_sys.scss`, `_ref.scss`)

## Components

- `shared/ui/actions/Button.vue`: Shared button primitive. Prefer it over page-local button classes; use `appearance="pill"` for compact CTA clusters and `appearance="rect"` for dialogs or block actions. Keep `tone` choices narrow (`primary`, `outline`, `secondary`, `surface`, `tertiary`, `dashed`, `danger`, `ghost`).
- `shared/ui/actions/ActionLink.vue`: Shared action-looking link primitive for `<RouterLink>` and external `<a>` CTAs. Use it instead of page-local link classes that recreate action treatment styles.
- `shared/ui/actions/FeedbackButton.vue`: Shared transient feedback action button. Use `state="pending|success|error"` for short-lived action results instead of page-local `.success` / `.error` button treatments.
- `shared/ui/containers/SurfaceCard.vue`: Standard card shell for reusable section, inset, and outline surfaces. Use it instead of re-declaring card shells in pages when the wrapper itself is a reusable primitive.
- `shared/ui/containers/ChoiceCard.vue`: Selectable card primitive for button-like choices and RouterLink navigation choices. Use it for repeated default/active selectable card shells without embedding domain semantics.
- `shared/ui/layout/FullScreenPageScaffold.vue`: Viewport-height page scaffold with `header`, content, and `footer` regions. Use it when the main content should absorb remaining height and manage its own inner scrolling.
- `shared/ui/layout/FooterRevealPageScaffold.vue`: Viewport-first page scaffold with `header`, content, and `footer` regions where `header + content` fill the first screen and the footer appears only after continued page scroll.
- `shared/ui/forms/FormField.vue`: Label + control + hint/error wrapper for plain form rows. It does not own the input shell; pair it with native controls or existing form primitives that already style the control.
- `shared/ui/forms/TextareaInput.vue`: Shared textarea primitive with stable shell, optional char count, and configurable rows/max length. Prefer it when multiple screens need the same textarea treatment instead of re-implementing native `<textarea>` styling locally.
- `shared/ui/forms/ProductLocalDateCalendarPicker.vue`: Product-local date-key calendar grid for visible-window multi-select flows. Keep search policy such as defaults, fallback, and allowed-date derivation in the owning page or domain component.
- `shared/ui/display/InfoRow.vue`: Generic label/value row with inline or stacked layout. Use it for neutral metadata presentation, not domain-specific timeline or status logic.
- `shared/ui/display/Chip.vue` and `shared/ui/display/ChipGroup.vue`: Neutral tokenized chips for tags, lightweight roster labels, and compact metadata groups. Use `size="lg"` when replacing legacy pill-badge treatments. Do not move domain semantics like PR status into these when a domain badge already exists.
- `shared/ui/display/FitChipGroup.vue`: Single-line chip row that measures available width and only shows whole chips that fully fit. Prefer it when chip text must stay complete and overflow should hide entire chips rather than truncate them.
- `shared/ui/feedback/InlineNotice.vue`: Inline success/info/warning/error banner. Prefer it over page-local feedback blocks when the message is simple and does not need toast behavior.
- `shared/ui/feedback/EmptyState.vue`: Empty or not-found shell with title, description, icon, and optional actions slot.
- `shared/ui/overlay/ConfirmDialog.vue`: Standard confirm/cancel dialog built on `Modal` and `Button`. Use it for straightforward confirmation flows instead of rebuilding modal actions per page.
- `shared/ui/identity/Avatar.vue`: Shared avatar with image and fallback initial. Prefer it over per-page avatar fallback markup when the need is generic identity display.
- `shared/ui/overlay/Modal.vue`: Generic modal primitive. Add scroll locking with `useBodyScrollLock(computed(() => open.value))` in the parent when needed.
- `domains/event/ui/composites/AnchorEventRadioCardCarousel.vue`: Event-domain carousel selector that centers and enlarges the selected Anchor Event card while keeping event-card content reuse local to the event domain.
- `domains/pr/ui/forms/DateTimeRangePicker.vue`: Standalone time-window picker for start/end date-time.
- `domains/pr/ui/forms/PRForm.vue`: Structured PR create/edit form using `src/lib/validation`.
- `domains/share/ui/composites/PRShareCarousel.vue`: Share-method carousel host.
- `domains/share/ui/methods/as-link/ShareAsLink.vue`: Link-sharing method UI.
- `domains/share/ui/methods/xhs/ShareToXiaohongshu.vue`: Xiaohongshu sharing method UI.
- `domains/share/ui/methods/wechat/ShareToWechatChat.vue`: WeChat sharing method UI.

## Composables

- `shared/upload/useCloudStorage.ts`: Handles file uploads to the backend and returns download URLs.
