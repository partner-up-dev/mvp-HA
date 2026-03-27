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
  @include mx.pu-surface-card(section);
}

.surface-card--tone-inset-high {
  @include mx.pu-surface-card(inset-high);
}

.surface-card--tone-outline {
  @include mx.pu-surface-card(outline);
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
