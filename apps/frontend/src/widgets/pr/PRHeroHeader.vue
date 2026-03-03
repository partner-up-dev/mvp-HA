<template>
  <PageHeader
    :title="title ?? t('prPage.metaFallbackTitle')"
    @back="emit('back')"
  >
    <template #meta>
      <PRStatusBadge :status="status" />
      <time class="created-at">{{ createdAtLabel }}</time>
    </template>
  </PageHeader>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PRStatus } from "@partner-up-dev/backend";
import PRStatusBadge from "@/components/pr/PRStatusBadge.vue";
import PageHeader from "@/components/common/PageHeader.vue";

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
