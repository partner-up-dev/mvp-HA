<template>
  <AdminRailPanel :title="t('adminBookingExecution.searchTitle')">
    <label class="field">
      <span class="field-label">{{ t("adminBookingExecution.searchLabel") }}</span>
      <input
        :value="modelValue"
        class="field-input"
        :placeholder="t('adminBookingExecution.searchPlaceholder')"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <div class="stats-list">
      <p class="stat-line">
        <span>{{ t("adminBookingExecution.statsPending") }}</span>
        <strong>{{ pendingCount }}</strong>
      </p>
      <p class="stat-line">
        <span>{{ t("adminBookingExecution.statsAudit") }}</span>
        <strong>{{ auditCount }}</strong>
      </p>
      <p class="stat-line">
        <span>{{ t("adminBookingExecution.statsFilteredPending") }}</span>
        <strong>{{ filteredPendingCount }}</strong>
      </p>
      <p class="stat-line">
        <span>{{ t("adminBookingExecution.statsFilteredAudit") }}</span>
        <strong>{{ filteredAuditCount }}</strong>
      </p>
    </div>
  </AdminRailPanel>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";

defineProps<{
  modelValue: string;
  pendingCount: number;
  auditCount: number;
  filteredPendingCount: number;
  filteredAuditCount: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.field,
.stats-list {
  display: flex;
  flex-direction: column;
}

.field {
  gap: var(--sys-spacing-xsmall);
}

.stats-list {
  gap: var(--sys-spacing-small);
}

.field-label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.stat-line {
  @include mx.pu-font(body-medium);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  margin: 0;
}
</style>
