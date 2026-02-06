<template>
  <article class="pr-card">
    <div class="field" v-if="type">
      <span class="label">{{ t("prCard.type") }}</span>
      <span class="value">{{ type }}</span>
    </div>

    <div class="field" v-if="formattedTime">
      <span class="label">{{ t("prCard.time") }}</span>
      <span class="value">{{ formattedTime }}</span>
    </div>

    <div class="field" v-if="location">
      <span class="label">{{ t("prCard.location") }}</span>
      <span class="value">{{ location }}</span>
    </div>

    <div class="field" v-if="shouldShowPartners">
      <span class="label">{{ t("prCard.partners") }}</span>
      <span class="value">{{ formattedPartners }}</span>
    </div>

    <div class="field" v-if="budget">
      <span class="label">{{ t("prCard.budget") }}</span>
      <span class="value">{{ budget }}</span>
    </div>

    <div class="field" v-if="preferences.length">
      <span class="label">{{ t("prCard.preferences") }}</span>
      <div class="tags">
        <span class="tag" v-for="pref in preferences" :key="pref">
          {{ pref }}
        </span>
      </div>
    </div>

    <div class="field" v-if="notes">
      <span class="label">{{ t("prCard.notes") }}</span>
      <span class="value">{{ notes }}</span>
    </div>

    <details class="raw-text">
      <summary>{{ t("prCard.rawText") }}</summary>
      <p>{{ rawText }}</p>
    </details>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

type PartnersTuple = [number | null, number, number | null];

type TimeWindow = [string | null, string | null];

const props = defineProps<{
  type: string;
  time: TimeWindow;
  location: string | null;
  partners: PartnersTuple;
  budget: string | null;
  preferences: string[];
  notes: string | null;
  rawText: string;
}>();
const { t } = useI18n();

const normalizeTimeValue = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed;
};

const formatTimeWindow = (time: TimeWindow): string | null => {
  const start = normalizeTimeValue(time[0]);
  const end = normalizeTimeValue(time[1]);
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return null;
};

const formatPartners = (min: number | null, current: number, max: number | null) => {
  const parts: string[] = [];

  if (max !== null) {
    parts.push(t("prCard.partnersCurrentWithMax", { current, max }));
  } else {
    parts.push(t("prCard.partnersCurrentOnly", { current }));
  }

  if (min !== null) {
    parts.push(t("prCard.partnersAtLeastClause", { min }));
  }

  if (parts.length === 0) {
    if (min !== null && max !== null) {
      if (min === max) {
        return t("prCard.partnersExact", { count: min });
      }
      return t("prCard.partnersRange", { min, max });
    }
    if (min !== null) {
      return t("prCard.partnersAtLeast", { min });
    }
    if (max !== null) {
      return t("prCard.partnersAtMost", { max });
    }
  }

  return parts.join(" ");
};

const formattedTime = computed(() => formatTimeWindow(props.time));
const formattedPartners = computed(() =>
  formatPartners(props.partners[0], props.partners[1], props.partners[2]),
);
const shouldShowPartners = computed(() => {
  const [min, current, max] = props.partners;
  return min !== null || max !== null || current > 0;
});
</script>

<style lang="scss" scoped>
.pr-card {
  background: var(--sys-color-surface-container);
  border-radius: var(--sys-radius-lg);
  padding: var(--sys-spacing-med);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  .label {
    @include mx.pu-font(label-medium);
    color: var(--sys-color-on-surface-variant);
  }

  .value {
    @include mx.pu-font(body-large);
    color: var(--sys-color-on-surface);
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs);
}

.tag {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
  border-radius: var(--sys-radius-sm);
}

.raw-text {
  margin-top: var(--sys-spacing-sm);

  summary {
    @include mx.pu-font(label-medium);
    color: var(--sys-color-on-surface-variant);
    cursor: pointer;
  }

  p {
    @include mx.pu-font(body-large);
    margin-top: var(--sys-spacing-sm);
    color: var(--sys-color-on-surface-variant);
    font-style: italic;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
}
</style>
