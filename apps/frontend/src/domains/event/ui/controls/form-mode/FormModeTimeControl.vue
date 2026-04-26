<template>
  <section class="form-mode-time-control">
    <div class="form-mode-time-control__header">
      <h2 class="form-mode-time-control__title">
        {{ t("anchorEvent.formMode.timeTitle") }}
      </h2>
    </div>

    <div class="time-wheel">
      <div class="time-wheel__column">
        <div class="time-wheel__list" role="listbox" aria-label="M.D">
          <button
            v-for="group in activeStartOptionGroups"
            :key="group.dateKey"
            class="time-wheel__option"
            :class="{
              'time-wheel__option--selected':
                group.dateKey === selectedDateKey,
            }"
            type="button"
            @click="selectedDateKey = group.dateKey"
          >
            {{ group.dateLabel }}
          </button>
        </div>
      </div>

      <div class="time-wheel__column">
        <div class="time-wheel__list" role="listbox" aria-label="HH:mm">
          <button
            v-for="option in activeTimeOptions"
            :key="option.key"
            class="time-wheel__option"
            :class="{
              'time-wheel__option--selected':
                option.startAt === props.modelValue,
            }"
            type="button"
            @click="emit('update:modelValue', option.startAt)"
          >
            {{ formatFormModeTimeLabel(option.startAt) }}
          </button>
        </div>
      </div>
    </div>

    <div class="time-mode-row">
      <p class="time-mode-row__duration">
        {{ durationLabel }}
      </p>

      <button
        class="time-mode-toggle"
        :class="{ 'time-mode-toggle--active': advancedMode }"
        type="button"
        role="switch"
        :aria-checked="advancedMode"
        @click="advancedMode = !advancedMode"
      >
        <span class="time-mode-toggle__label">
          {{ t("anchorEvent.formMode.advancedModeLabel") }}
        </span>
        <span class="time-mode-toggle__track" aria-hidden="true">
          <span class="time-mode-toggle__thumb" />
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
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

const durationLabel = computed(() =>
  formatFormModeDurationLabel(props.durationMinutes),
);

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
  gap: var(--sys-spacing-sm);
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
  gap: var(--sys-spacing-xs);
}

.time-wheel__column {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.time-wheel__list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  height: clamp(7rem, 18vh, 9.5rem);
  padding: var(--sys-spacing-xs) 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.time-wheel__list::-webkit-scrollbar {
  display: none;
}

.time-wheel__option {
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--sys-color-on-surface-variant);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  cursor: pointer;
  text-align: center;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
  @include mx.pu-font(title-small);
}

.time-wheel__option--selected {
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface);
  transform: translateY(-2px);
}

.time-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  flex-wrap: nowrap;
  color: var(--sys-color-on-surface-variant);
}

.time-mode-row__duration {
  margin: 0;
  color: inherit;
  @include mx.pu-font(body-medium);
}

.time-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.time-mode-toggle__label {
  @include mx.pu-font(label-large);
}

.time-mode-toggle__track {
  position: relative;
  width: 3rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--sys-color-surface-container-highest);
  transition: background-color 180ms ease;
}

.time-mode-toggle__thumb {
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  background: var(--sys-color-on-surface-variant);
  transition:
    transform 180ms ease,
    background-color 180ms ease;
}

.time-mode-toggle--active .time-mode-toggle__track {
  background: var(--sys-color-primary-container);
}

.time-mode-toggle--active .time-mode-toggle__thumb {
  transform: translateX(1.2rem);
  background: var(--sys-color-primary);
}

@media (max-width: 720px) {
  .time-mode-row {
    gap: var(--sys-spacing-xs);
  }
}
</style>
