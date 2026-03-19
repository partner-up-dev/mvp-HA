<template>
  <span class="status-badge" :class="status.toLowerCase()">
    {{ statusText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRStatus } from "@partner-up-dev/backend";

const props = defineProps<{
  status: PRStatus;
}>();
const { t } = useI18n();

const statusText = computed(() => {
  const map = {
    DRAFT: t("status.draft"),
    OPEN: t("status.open"),
    READY: t("status.ready"),
    FULL: t("status.full"),
    LOCKED_TO_START: t("status.lockedToStart"),
    ACTIVE: t("status.active"),
    CLOSED: t("status.closed"),
    EXPIRED: t("status.expired"),
  };
  return map[props.status];
});
</script>

<style lang="scss" scoped>
.status-badge {
  @include mx.pu-font(label-large);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: var(--sys-radius-sm);

  &.draft {
    background: var(--sys-color-surface-container-highest);
    color: var(--sys-color-on-surface);
  }

  &.open {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &.ready {
    background: var(--sys-color-tertiary-container);
    color: var(--sys-color-on-tertiary-container);
  }

  &.full {
    background: var(--sys-color-error-container);
    color: var(--sys-color-on-error-container);
  }

  &.active {
    background: var(--sys-color-tertiary-container);
    color: var(--sys-color-on-tertiary-container);
  }

  &.locked_to_start {
    background: var(--sys-color-secondary-container);
    color: var(--sys-color-on-secondary-container);
  }

  &.closed,
  &.expired {
    background: var(--sys-color-surface-container);
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
