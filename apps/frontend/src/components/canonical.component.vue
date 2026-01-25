<template>
  <div class="status-badge" :class="status.toLowerCase()">
    {{ statusText }}
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: "OPEN" | "FULL" | "CLOSED";
}>();

const statusText = computed(() => {
  const map = {
    OPEN: "招募中",
    FULL: "已满员",
    CLOSED: "已关闭",
  };
  return map[props.status];
});
</script>

<style lang="scss" scoped>
.status-badge {
  @include mx.pu-font(label-large);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: var(--sys-radius-sm);

  &.open {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &.full {
    background: var(--sys-color-warning-container);
    color: var(--sys-color-on-warning-container);
  }

  &.closed {
    background: var(--sys-color-surface-container);
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
