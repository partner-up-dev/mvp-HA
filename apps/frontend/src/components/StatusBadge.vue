<template>
  <span class="status-badge" :class="status.toLowerCase()">
    {{ statusText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: "OPEN" | "ACTIVE" | "CLOSED" | "EXPIRED";
}>();

const statusText = computed(() => {
  const map = {
    OPEN: "可加入",
    ACTIVE: "进行中",
    CLOSED: "已结束",
    EXPIRED: "已过期",
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

  &.active {
    background: var(--sys-color-tertiary-container);
    color: var(--sys-color-on-tertiary-container);
  }

  &.closed {
    background: var(--sys-color-surface-container);
    color: var(--sys-color-on-surface-variant);
  }

  &.expired {
    background: var(--sys-color-surface-container);
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
