<template>
  <div class="page-header">
    <button class="home-btn" @click="emit('back')" :aria-label="t('common.backToHome')">
      <div class="i-mdi-arrow-left font-title-large"></div>
    </button>
    <h1 v-if="title" class="page-title">
      {{ title }}
    </h1>
  </div>

  <header class="status-header">
    <PRStatusBadge :status="status" />
    <time class="created-at">{{ createdAtLabel }}</time>
  </header>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PRStatus } from "@partner-up-dev/backend";
import PRStatusBadge from "@/components/common/PRStatusBadge.vue";

defineProps<{
  title?: string;
  status: PRStatus;
  createdAtLabel: string;
}>();

const emit = defineEmits<{
  back: [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-lg);
  min-width: 0;
}

.home-btn {
  display: flex;
  background: transparent;
  border: none;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  min-width: var(--sys-size-large);
  min-height: var(--sys-size-large);
  border-radius: 999px;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--sys-color-surface-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.page-title {
  @include mx.pu-font(headline-large);
  color: var(--sys-color-on-surface);
  margin: 0;
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sys-spacing-med);
}

.created-at {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}
</style>

