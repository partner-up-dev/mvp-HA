<template>
  <component
    :is="as"
    class="surface-card"
    :class="[`surface-card--tone-${tone}`, `surface-card--gap-${gap}`]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
type SurfaceCardTone = "section" | "inset-high" | "outline";
type SurfaceCardGap = "none" | "xs" | "sm" | "md" | "lg";

withDefaults(
  defineProps<{
    as?: string;
    tone?: SurfaceCardTone;
    gap?: SurfaceCardGap;
  }>(),
  {
    as: "section",
    tone: "section",
    gap: "sm",
  },
);
</script>

<style lang="scss" scoped>
.surface-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.surface-card--tone-section {
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
}

.surface-card--tone-inset-high {
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);
}

.surface-card--tone-outline {
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  background: transparent;
}

.surface-card--gap-none {
  gap: 0;
}

.surface-card--gap-xs {
  gap: var(--sys-spacing-xsmall);
}

.surface-card--gap-sm {
  gap: var(--sys-spacing-small);
}

.surface-card--gap-md {
  gap: var(--sys-spacing-medium);
}

.surface-card--gap-lg {
  gap: var(--sys-spacing-large);
}
</style>
