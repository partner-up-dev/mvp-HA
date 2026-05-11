<template>
  <component
    :is="as"
    class="chip-group"
    :class="[`chip-group--gap-${gap}`, `chip-group--align-${align}`]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
type ChipGroupGap = "xs" | "sm" | "md";
type ChipGroupAlign = "start" | "center" | "end";

withDefaults(
  defineProps<{
    as?: string;
    gap?: ChipGroupGap;
    align?: ChipGroupAlign;
  }>(),
  {
    as: "div",
    gap: "xs",
    align: "start",
  },
);
</script>

<style lang="scss" scoped>
.chip-group {
  display: flex;
  flex-wrap: wrap;
}

.chip-group--gap-xs {
  gap: var(--sys-spacing-xsmall);
}

.chip-group--gap-sm {
  gap: var(--sys-spacing-small);
}

.chip-group--gap-md {
  gap: var(--sys-spacing-medium);
}

.chip-group--align-start {
  justify-content: flex-start;
}

.chip-group--align-center {
  justify-content: center;
}

.chip-group--align-end {
  justify-content: flex-end;
}
</style>
