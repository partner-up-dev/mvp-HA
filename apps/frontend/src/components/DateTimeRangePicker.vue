<template>
  <div class="form-field">
    <label>{{ label }}</label>
    <div class="time-range">
      <div class="time-block">
        <div class="time-inputs">
          <input v-model="startDate" type="date" placeholder="请选择开始日期" />
          <input
            v-model="startTime"
            type="time"
            placeholder="请选择开始时间"
            :disabled="!startDate"
          />
        </div>
        <div class="time-actions">
          <button
            type="button"
            class="clear-time"
            :disabled="!startTime"
            @click="clearStartTime"
          >
            清除时间
          </button>
          <button
            type="button"
            class="clear-time"
            :disabled="!startDate && !startTime"
            @click="clearStart"
          >
            清除
          </button>
        </div>
      </div>
      <div class="time-block">
        <div class="time-inputs">
          <input v-model="endDate" type="date" placeholder="请选择结束日期" />
          <input
            v-model="endTime"
            type="time"
            placeholder="请选择结束时间"
            :disabled="!endDate"
          />
        </div>
        <div class="time-actions">
          <button
            type="button"
            class="clear-time"
            :disabled="!endTime"
            @click="clearEndTime"
          >
            清除时间
          </button>
          <button
            type="button"
            class="clear-time"
            :disabled="!endDate && !endTime"
            @click="clearEnd"
          >
            清除
          </button>
        </div>
      </div>
    </div>
    <p class="time-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import type { PartnerRequestFields } from "@partner-up-dev/backend";

type TimeWindow = PartnerRequestFields["time"];

interface Props {
  modelValue: TimeWindow;
  label?: string;
  hint?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "时间 (开始/结束)",
  hint: "请选择开始和结束日期/时间（可省略）",
});

const emit = defineEmits<{
  "update:modelValue": [TimeWindow];
}>();

const splitTimeValue = (
  value: string | null,
): { date: string | null; time: string | null } => {
  if (!value) return { date: null, time: null };
  if (!value.includes("T")) return { date: value, time: null };
  const [datePart, timePart = ""] = value.split("T");
  const timeMatch = timePart.match(/^\d{2}:\d{2}/);
  return { date: datePart || null, time: timeMatch ? timeMatch[0] : null };
};

const buildTimeValue = (
  date: string | null,
  time: string | null,
): string | null => {
  if (!date) return null;
  if (!time) return date;
  return `${date}T${time}`;
};

const startDate = ref<string | null>(null);
const startTime = ref<string | null>(null);
const endDate = ref<string | null>(null);
const endTime = ref<string | null>(null);

const isSyncing = ref(false);

const syncFromModel = (value: TimeWindow) => {
  const start = splitTimeValue(value?.[0] ?? null);
  const end = splitTimeValue(value?.[1] ?? null);
  startDate.value = start.date;
  startTime.value = start.time;
  endDate.value = end.date;
  endTime.value = end.time;
};

watch(
  () => props.modelValue,
  async (value) => {
    isSyncing.value = true;
    syncFromModel(value);
    await nextTick();
    isSyncing.value = false;
  },
  { immediate: true },
);

watch(startDate, (value) => {
  if (!value && startTime.value) startTime.value = null;
});

watch(endDate, (value) => {
  if (!value && endTime.value) endTime.value = null;
});

watch([startDate, startTime, endDate, endTime], () => {
  if (isSyncing.value) return;
  emit("update:modelValue", [
    buildTimeValue(startDate.value, startTime.value),
    buildTimeValue(endDate.value, endTime.value),
  ]);
});

const clearStart = () => {
  startDate.value = null;
  startTime.value = null;
};

const clearStartTime = () => {
  startTime.value = null;
};

const clearEnd = () => {
  endDate.value = null;
  endTime.value = null;
};

const clearEndTime = () => {
  endTime.value = null;
};
</script>

<style lang="scss" scoped>
.form-field {
  margin-bottom: var(--sys-spacing-med);

  label {
    @include mx.pu-font(label-medium);
    display: block;
    margin-bottom: var(--sys-spacing-xs);
    color: var(--sys-color-on-surface-variant);
  }
}

.time-range {
  display: grid;
  gap: var(--sys-spacing-sm);
}

.time-block {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.time-actions {
  display: grid;
  gap: var(--sys-spacing-xs);
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sys-spacing-sm);
  flex: 1;
}

input {
  @include mx.pu-font(body-large);
  width: 100%;
  padding: var(--sys-spacing-sm);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);

  &::placeholder {
    color: var(--sys-color-on-surface-variant);
    opacity: 0.6;
  }

  &:focus {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: -1px;
  }
}

.clear-time {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-xs);
  background: transparent;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  min-width: 64px;

  &:hover:not(:disabled) {
    background: var(--sys-color-surface-container);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.time-hint {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
  margin-top: var(--sys-spacing-xs);
}

@media (max-width: 480px) {
  .time-block {
    flex-direction: column;
    align-items: stretch;
  }

  .time-inputs {
    grid-template-columns: 1fr;
  }

  .time-actions {
    grid-template-columns: 1fr 1fr;
  }

  .clear-time {
    width: 100%;
    min-height: var(--sys-size-large);
  }
}
</style>
