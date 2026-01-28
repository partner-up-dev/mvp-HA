# AGENTS.md for Frontend Components

## Component Development Norms

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

Example: See `canonical.component.vue`

Prohibited:

- ❌ Hardcoded colors, sizes, or font properties
- ❌ Direct imports of token files (`_sys.scss`, `_ref.scss`)

## Components

- Modal.vue: For displaying modal dialogs. Note: add scroll locking with `useBodyScrollLock(computed(() => showModal.value))` in the parent component to prevent background scrolling.
- SharePR.vue: Inline share component with carousel navigation for multiple share methods. Shows preview of content to be shared and handles copy-to-clipboard action. Designed to be extensible for future share targets (WeChat, Xiaohongshu, etc.).
