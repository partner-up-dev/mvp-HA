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
  padding: var(--sys-spacing-med);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface-container);
}

.surface-card--tone-inset-high {
  padding: var(--sys-spacing-sm);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container-high);
}

.surface-card--tone-outline {
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: transparent;
}

.surface-card--gap-none {
  gap: 0;
}

.surface-card--gap-xs {
  gap: var(--sys-spacing-xs);
}

.surface-card--gap-sm {
  gap: var(--sys-spacing-sm);
}

.surface-card--gap-md {
  gap: var(--sys-spacing-med);
}

.surface-card--gap-lg {
  gap: var(--sys-spacing-lg);
}
</style>
