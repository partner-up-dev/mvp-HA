<template>
  <AdminRailPanel>
    <label class="field">
      <span class="field-label">{{ t("adminBookingSupport.eventLabel") }}</span>
      <select
        :value="modelValue"
        class="field-input"
        @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ t("adminBookingSupport.eventPlaceholder") }}</option>
        <option
          v-for="event in anchorEvents"
          :key="event.id"
          :value="String(event.id)"
        >
          {{ event.title }}
        </option>
      </select>
    </label>
  </AdminRailPanel>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";

defineProps<{
  modelValue: string;
  anchorEvents: Array<{
    id: number;
    title: string;
  }>;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
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
