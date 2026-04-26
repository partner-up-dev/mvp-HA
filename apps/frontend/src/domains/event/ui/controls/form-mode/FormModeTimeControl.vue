<template>
  <section class="form-mode-time-control">
    <div class="form-mode-time-control__header">
      <h2 class="form-mode-time-control__title">
        {{ t("anchorEvent.formMode.timeTitle") }}
      </h2>
    </div>

    <div class="time-wheel">
      <WheelPicker
        :model-value="selectedDateKey"
        :options="dateWheelOptions"
        :item-height="42"
        :visible-count="5"
        :aria-label="t('anchorEvent.formMode.dateWheelAriaLabel')"
        :empty-label="t('anchorEvent.formMode.timePlaceholder')"
        @update:model-value="handleDateWheelUpdate"
      />

      <WheelPicker
        :model-value="props.modelValue"
        :options="timeWheelOptions"
        :item-height="42"
        :visible-count="5"
        :aria-label="t('anchorEvent.formMode.timeWheelAriaLabel')"
        :empty-label="t('anchorEvent.formMode.timePlaceholder')"
        @update:model-value="handleTimeWheelUpdate"
      />
    </div>

    <div class="time-mode-row">
      <p class="time-mode-row__duration">
        {{ durationLabel }}
      </p>

      <ToggleSwitch
        v-model="advancedMode"
        :label="t('anchorEvent.formMode.advancedModeLabel')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import WheelPicker, {
  type WheelPickerValue,
} from "@/shared/ui/forms/WheelPicker.vue";
import ToggleSwitch from "@/shared/ui/forms/ToggleSwitch.vue";
import {
  buildAdvancedModeStartOptions,
  buildStartOptionsByDate,
  formatFormModeDurationLabel,
  formatFormModeTimeLabel,
} from "@/domains/event/model/form-mode";

type StartOption = AnchorEventFormModeResponse["startOptions"][number];

const props = defineProps<{
  modelValue: string | null;
  startOptions: readonly StartOption[];
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { t } = useI18n();

const selectedDateKey = ref<string | null>(null);
const advancedMode = ref(false);

const defaultStartOptionGroups = computed(() =>
  buildStartOptionsByDate(props.startOptions),
);

const advancedStartOptionGroups = computed(() =>
  buildStartOptionsByDate(
    buildAdvancedModeStartOptions(props.earliestLeadMinutes),
  ),
);

const activeStartOptionGroups = computed(() =>
  advancedMode.value
    ? advancedStartOptionGroups.value
    : defaultStartOptionGroups.value,
);

const activeTimeOptions = computed<StartOption[]>(() => {
  const group = activeStartOptionGroups.value.find(
    (item) => item.dateKey === selectedDateKey.value,
  );
  return (group?.options ?? []) as StartOption[];
});

const dateWheelOptions = computed(() =>
  activeStartOptionGroups.value.map((group) => ({
    label: group.dateLabel,
    value: group.dateKey,
  })),
);

const timeWheelOptions = computed(() =>
  activeTimeOptions.value.map((option) => ({
    label: formatFormModeTimeLabel(option.startAt),
    value: option.startAt,
  })),
);

const durationLabel = computed(() =>
  formatFormModeDurationLabel(props.durationMinutes),
);

const handleDateWheelUpdate = (value: WheelPickerValue) => {
  selectedDateKey.value = String(value);
};

const handleTimeWheelUpdate = (value: WheelPickerValue) => {
  emit("update:modelValue", String(value));
};

watch(
  activeStartOptionGroups,
  (groups) => {
    if (
      selectedDateKey.value &&
      groups.some((group) => group.dateKey === selectedDateKey.value)
    ) {
      return;
    }
    selectedDateKey.value = groups[0]?.dateKey ?? null;
  },
  { immediate: true },
);

watch(
  [activeTimeOptions, selectedDateKey],
  ([options]) => {
    if (
      props.modelValue &&
      options.some((option) => option.startAt === props.modelValue)
    ) {
      return;
    }
    emit("update:modelValue", options[0]?.startAt ?? null);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.form-mode-time-control {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.form-mode-time-control__header {
  display: flex;
  flex-direction: column;
}

.form-mode-time-control__title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.time-wheel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-xsmall);
}

.time-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: nowrap;
  color: var(--sys-color-on-surface-variant);
}

.time-mode-row__duration {
  margin: 0;
  color: inherit;
  @include mx.pu-font(body-medium);
}

@media (max-width: 720px) {
  .time-mode-row {
    gap: var(--sys-spacing-xsmall);
  }
}
</style>
