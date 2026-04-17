<template>
  <component
    :is="as"
    class="ui-chip"
    :class="[`ui-chip--tone-${tone}`, `ui-chip--size-${size}`]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
type ChipTone =
  | "secondary"
  | "primary"
  | "surface"
  | "outline"
  | "danger"
  | "warning";
type ChipSize = "sm" | "md" | "lg";

withDefaults(
  defineProps<{
    as?: string;
    tone?: ChipTone;
    size?: ChipSize;
  }>(),
  {
    as: "span",
    tone: "secondary",
    size: "md",
  },
);
</script>

<style lang="scss" scoped>
.ui-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  border: 1px solid transparent;
  border-radius: 999px;
  white-space: nowrap;
}

.ui-chip--size-sm {
  @include mx.pu-font(label-small);
  padding: 0 calc(var(--sys-spacing-sm) - 2px);
  min-height: var(--sys-size-small);
}

.ui-chip--size-md {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  min-height: var(--sys-size-medium);
}

.ui-chip--size-lg {
  @include mx.pu-font(label-large);
  padding: var(--sys-spacing-xs) var(--sys-spacing-med);
  min-height: var(--sys-size-medium);
}

.ui-chip--tone-secondary {
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.ui-chip--tone-primary {
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
}

.ui-chip--tone-surface {
  background: var(--sys-color-surface-container-lowest);
  color: var(--sys-color-on-surface);
  border-color: var(--sys-color-outline-variant);
}

.ui-chip--tone-outline {
  background: transparent;
  color: var(--sys-color-on-surface);
  border-color: var(--sys-color-outline);
}

.ui-chip--tone-danger {
  background: var(--sys-color-error-container);
  color: var(--sys-color-on-error-container);
}

.ui-chip--tone-warning {
  background: var(--sys-color-warning);
  color: var(--sys-color-on-warning);
  border-color: var(--sys-color-warning);
}
</style>
