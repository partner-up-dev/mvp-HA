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

All components MUST follow `src/styles/TOKEN-GOVERNANCE.md`.

Default rule:

- use direct `sys` tokens first
- do not add `dcs` or a recipe if existing `sys` already solves the need without a severe visual regression

Components may use existing shared recipes when the treatment is already centralized, but should not add a new recipe just to hide ordinary `sys` usage.

- Mixins are auto-injected by Vite config for all components, use them directly:
  - `@include mx.pu-font($key)` - Typography (e.g., `body-large`, `label-small`)
  - `@include mx.pu-elevation($level)` - Shadows (levels 1-5)
  - `@include mx.pu-icon($size)` - Icon sizing (`sm`, `md`, `lg`)

- CSS Variables prefixed with `--sys-`:
  - Colors: `--sys-color-primary`, `--sys-color-surface-container`, etc.
  - Spacing: `--sys-spacing-xs`, `--sys-spacing-med`, etc.
  - Radius: `--sys-radius-sm`, `--sys-radius-lg`, etc.

Learn available tokens in `src/styles/_sys.scss`, governance rules in `src/styles/TOKEN-GOVERNANCE.md`, and shared recipes in `src/styles/_mixins.scss`.

Prohibited:

- ❌ Hardcoded colors, sizes, or font properties
- ❌ Adding a new recipe or `dcs` token when direct `sys` is already enough
- ❌ Direct imports of token files (`_sys.scss`, `_ref.scss`)

## Components

- `shared/ui/overlay/Modal.vue`: Generic modal primitive. Add scroll locking with `useBodyScrollLock(computed(() => open.value))` in the parent when needed.
- `domains/pr/ui/forms/DateTimeRangePicker.vue`: Standalone time-window picker for start/end date-time.
- `domains/pr/ui/forms/PRForm.vue`: Structured PR create/edit form using `src/lib/validation`.
- `domains/share/ui/composites/PRShareCarousel.vue`: Share-method carousel host.
- `domains/share/ui/methods/as-link/ShareAsLink.vue`: Link-sharing method UI.
- `domains/share/ui/methods/xhs/ShareToXiaohongshu.vue`: Xiaohongshu sharing method UI.
- `domains/share/ui/methods/wechat/ShareToWechatChat.vue`: WeChat sharing method UI.

## Composables

- `shared/upload/useCloudStorage.ts`: Handles file uploads to the backend and returns download URLs.
