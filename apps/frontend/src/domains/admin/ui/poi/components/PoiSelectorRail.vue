<template>
  <AdminRailPanel :title="t('adminPois.poiListTitle')">
    <p class="hint">{{ t("adminPois.poiCount", { count: pois.length }) }}</p>

    <label class="field">
      <span class="field-label">{{ t("adminPois.poiLabel") }}</span>
      <select
        :value="modelValue"
        class="field-input"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ t("adminPois.poiPlaceholder") }}</option>
        <option v-for="poi in pois" :key="poi.id" :value="poi.id">
          #{{ poi.id }} · {{ poi.name }} · {{ statusLabel(poi.status) }}
        </option>
      </select>
    </label>
  </AdminRailPanel>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AdminPoisResponse } from "@/domains/admin/queries/useAdminPoiManagement";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";

type PoiRecord = NonNullable<AdminPoisResponse>[number];
type PoiStatus = PoiRecord["status"];

defineProps<{
  modelValue: string;
  pois: PoiRecord[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const { t } = useI18n();

const statusLabel = (status: PoiStatus): string => {
  switch (status) {
    case "PENDING":
      return t("adminPois.statusPending");
    case "PUBLISHED":
      return t("adminPois.statusPublished");
    case "REJECTED":
      return t("adminPois.statusRejected");
  }
};
</script>

<style lang="scss" scoped>
.hint {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
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
</style>
