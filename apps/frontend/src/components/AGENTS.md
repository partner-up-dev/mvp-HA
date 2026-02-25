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
import { useUser } from '@/queries/useUser';
import { useRoute } from 'vue-router';

const route = useRoute();
// Assuming route param id
const { data: user, isLoading, error } = useUser(Number(route.params.id));
</script>
```

### Styling

All components MUST use the design token system via CSS variables and mixins.

- Mixins are auto-injected by Vite config for all components, use them directly:
  - `@include mx.pu-font($key)` - Typography (e.g., `body-large`, `label-small`)
  - `@include mx.pu-elevation($level)` - Shadows (levels 1-5)
  - `@include mx.pu-icon($size)` - Icon sizing (`sm`, `md`, `lg`)

- CSS Variables prefixed with `--sys-`:
  - Colors: `--sys-color-primary`, `--sys-color-surface-container`, etc.
  - Spacing: `--sys-spacing-xs`, `--sys-spacing-md`, etc.
  - Radius: `--sys-radius-sm`, `--sys-radius-lg`, etc.

Learn available tokens in `src/styles/_sys.scss` and mixins in `src/styles/_mixins.scss`.

Example: See `components/__examples__/CanonicalComponentExample.vue`

Prohibited:

- ❌ Hardcoded colors, sizes, or font properties
- ❌ Direct imports of token files (`_sys.scss`, `_ref.scss`)

## Components

- components/common/Modal.vue: For displaying modal dialogs. Note: add scroll locking with `useBodyScrollLock(computed(() => showModal.value))` in the parent component to prevent background scrolling.
- components/pr/DateTimeRangePicker.vue: Standalone time window picker for start/end date/time. Uses `v-model` to emit `[start, end]` values in `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` format.
- components/pr/PRForm.vue: Structured PR creation/edit form. Uses `vee-validate` schemas from `src/lib/validation`.
- components/share/PRShareCarousel.vue: Carousel host for share methods. Renders per-method components:
  - components/share/as-link/ShareAsLink.vue
  - components/share/xhs/ShareToXiaohongshu.vue
  - components/share/wechat/ShareToWechatChat.vue
  Each method component owns its options, preview, and actions and uses shared types from `components/share/types.ts`.
  Carousel auto-rotates every 3 seconds and permanently stops for the current mount after user nav click or share-method content interaction.

## Composables

- `useCloudStorage()`: Handles file uploads to the backend and returns download URLs.
