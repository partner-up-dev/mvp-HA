<template>
  <RouterLink
    :to="prDetailPath(props.result.pr.id as PRId)"
    class="event-pr-search-result-card"
  >
    <div class="event-pr-search-result-card__header">
      <h2
        v-if="props.result.pr.title"
        class="event-pr-search-result-card__title"
      >
        {{ props.result.pr.title }}
      </h2>
      <PRStatusBadge
        class="event-pr-search-result-card__status"
        :status="props.result.pr.status"
        size="sm"
        appearance="pill"
      />
    </div>

    <p class="event-pr-search-result-card__meta">
      <span>{{ timeLabel }}</span>
      <span>{{ locationLabel }}</span>
      <span>{{ partnerCountLabel }}</span>
    </p>
  </RouterLink>
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import type { PRSearchResult } from "@/domains/pr/model/types";
import { prDetailPath } from "@/domains/pr/routing/routes";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

const props = defineProps<{
  result: PRSearchResult;
}>();

const { t } = useI18n();

const timeLabel = computed(
  () =>
    formatLocalDateTimeValue(props.result.pr.time[0], {
      includeDate: true,
      includeTime: true,
    }) ?? t("eventPRSearch.resultCard.unknownTime"),
);

const locationLabel = computed(
  () => props.result.pr.location ?? t("eventPRSearch.resultCard.unknownLocation"),
);

const partnerCountLabel = computed(() => {
  if (props.result.pr.maxPartners !== null) {
    return t("eventPRSearch.resultCard.partnerCountWithMax", {
      current: props.result.pr.partnerCount,
      max: props.result.pr.maxPartners,
    });
  }

  return t("eventPRSearch.resultCard.partnerCountWithoutMax", {
    current: props.result.pr.partnerCount,
  });
});
</script>

<style lang="scss" scoped>
.event-pr-search-result-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
  @include mx.pu-elevation(2);

  &:active {
    transform: scale(0.985);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.event-pr-search-result-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.event-pr-search-result-card__title,
.event-pr-search-result-card__meta {
  margin: 0;
}

.event-pr-search-result-card__title {
  @include mx.pu-font(title-medium);
}

.event-pr-search-result-card__status {
  flex-shrink: 0;
}

.event-pr-search-result-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body-medium);
}
</style>
