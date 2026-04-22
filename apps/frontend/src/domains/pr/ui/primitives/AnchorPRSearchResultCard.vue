<template>
  <RouterLink
    :to="prDetailPath(props.result.pr.id as PRId)"
    class="anchor-pr-search-result-card"
  >
    <div class="anchor-pr-search-result-card__header">
      <h2
        v-if="props.result.pr.title"
        class="anchor-pr-search-result-card__title"
      >
        {{ props.result.pr.title }}
      </h2>
      <PRStatusBadge
        class="anchor-pr-search-result-card__status"
        :status="props.result.pr.status"
        size="sm"
        appearance="pill"
      />
    </div>

    <p class="anchor-pr-search-result-card__meta">
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
import type { AnchorPRSearchResult } from "@/domains/pr/model/types";
import { prDetailPath } from "@/domains/pr/routing/routes";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

const props = defineProps<{
  result: AnchorPRSearchResult;
}>();

const { t } = useI18n();

const timeLabel = computed(
  () =>
    formatLocalDateTimeValue(props.result.pr.time[0], {
      includeDate: true,
      includeTime: true,
    }) ?? t("anchorPRSearch.resultCard.unknownTime"),
);

const locationLabel = computed(
  () => props.result.pr.location ?? t("anchorPRSearch.resultCard.unknownLocation"),
);

const partnerCountLabel = computed(() => {
  if (props.result.pr.maxPartners !== null) {
    return t("anchorPRSearch.resultCard.partnerCountWithMax", {
      current: props.result.pr.partnerCount,
      max: props.result.pr.maxPartners,
    });
  }

  return t("anchorPRSearch.resultCard.partnerCountWithoutMax", {
    current: props.result.pr.partnerCount,
  });
});
</script>

<style lang="scss" scoped>
.anchor-pr-search-result-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-med);
  border-radius: var(--sys-radius-med);
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

.anchor-pr-search-result-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
}

.anchor-pr-search-result-card__title,
.anchor-pr-search-result-card__meta {
  margin: 0;
}

.anchor-pr-search-result-card__title {
  @include mx.pu-font(title-medium);
}

.anchor-pr-search-result-card__status {
  flex-shrink: 0;
}

.anchor-pr-search-result-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs) var(--sys-spacing-sm);
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body-medium);
}
</style>
