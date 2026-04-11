<template>
  <div class="anchor-pr-search-form">
    <section class="anchor-pr-search-form__section">
      <div class="anchor-pr-search-form__section-header">
        <h2>{{ t("anchorPRSearch.form.eventTitle") }}</h2>
      </div>

      <AnchorEventRadioCardCarousel
        :model-value="props.selectedEventId"
        :events="props.events"
        :disabled="props.disabled"
        :aria-label="t('anchorPRSearch.form.eventTitle')"
        @update:model-value="emit('update:selectedEventId', $event)"
      />
    </section>

    <section class="anchor-pr-search-form__section">
      <div class="anchor-pr-search-form__section-header">
        <h2>{{ t("anchorPRSearch.form.dateTitle") }}</h2>
      </div>

      <ProductLocalDateCalendarPicker
        :model-value="selectedDateKeys"
        :visible-date-keys="calendarVisibleDateKeys"
        :selectable-date-keys="selectableDateKeys"
        :weekday-labels="weekdayLabels"
        :disabled="props.disabled"
        :today-label="t('anchorPRSearch.form.todayMarker')"
        @update:model-value="emit('update:selectedDates', $event)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventListItem } from "@/domains/event/model/types";
import AnchorEventRadioCardCarousel from "@/domains/event/ui/composites/AnchorEventRadioCardCarousel.vue";
import {
  getProductLocalWeekStartDateKey,
  getTodayProductLocalDateKey,
  listProductLocalDateKeysFrom,
  normalizeProductLocalDateKeys,
} from "@/shared/datetime/productLocalDate";
import ProductLocalDateCalendarPicker from "@/shared/ui/forms/ProductLocalDateCalendarPicker.vue";

const SEARCH_CALENDAR_WEEK_COUNT = 4;
const DAYS_PER_WEEK = 7;

const props = withDefaults(
  defineProps<{
    events: AnchorEventListItem[];
    selectedEventId: number | null;
    selectedDates: string[];
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:selectedEventId": [value: number | null];
  "update:selectedDates": [value: string[]];
}>();

const { t } = useI18n();

const weekdayLabels = computed(() => [
  t("anchorPRSearch.form.weekdays.mon"),
  t("anchorPRSearch.form.weekdays.tue"),
  t("anchorPRSearch.form.weekdays.wed"),
  t("anchorPRSearch.form.weekdays.thu"),
  t("anchorPRSearch.form.weekdays.fri"),
  t("anchorPRSearch.form.weekdays.sat"),
  t("anchorPRSearch.form.weekdays.sun"),
]);

const todayDateKey = getTodayProductLocalDateKey();
const calendarWindowStartDateKey =
  getProductLocalWeekStartDateKey(todayDateKey) ?? todayDateKey;
const calendarVisibleDateKeys = listProductLocalDateKeysFrom(
  calendarWindowStartDateKey,
  SEARCH_CALENDAR_WEEK_COUNT * DAYS_PER_WEEK,
);
const selectableDateKeys = calendarVisibleDateKeys.filter(
  (dateKey) => dateKey >= todayDateKey,
);
const selectableDateSet = new Set(selectableDateKeys);

const selectedDateKeys = computed(() =>
  normalizeProductLocalDateKeys(props.selectedDates).filter((dateKey) =>
    selectableDateSet.has(dateKey),
  ),
);
</script>

<style lang="scss" scoped>
.anchor-pr-search-form {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-lg);
}

.anchor-pr-search-form__section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.anchor-pr-search-form__section-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(title-medium);
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
