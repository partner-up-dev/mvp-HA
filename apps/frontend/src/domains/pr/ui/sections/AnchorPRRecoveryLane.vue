<template>
  <section v-if="hasContent" ref="recoveryRoot" class="recovery-lane">
    <section
      v-if="section.fallbacks.sameBatchAlternatives.length > 0"
      class="recovery-group"
    >
      <header class="recovery-group__header">
        <h2 class="recovery-group__title">{{ t("prPage.sameBatch.title") }}</h2>
        <p class="recovery-group__note">{{ t("prPage.sameBatch.subtitle") }}</p>
      </header>

      <div class="recovery-links">
        <router-link
          v-for="item in section.fallbacks.sameBatchAlternatives"
          :key="item.id"
          :to="anchorPRDetailPath(item.id)"
          class="recovery-link-row"
          @click="handleSameBatchClick(item.id)"
        >
          <span class="recovery-link-row__location">{{ item.location }}</span>
          <span class="recovery-link-row__meta">{{ t(`prStatus.${item.status}`) }}</span>
        </router-link>
      </div>
    </section>

    <section
      v-if="section.fallbacks.alternativeBatches.length > 0"
      class="recovery-group"
    >
      <header class="recovery-group__header">
        <h2 class="recovery-group__title">
          {{ t("prPage.alternativeBatch.title") }}
        </h2>
        <p class="recovery-group__note">
          {{ t("prPage.alternativeBatch.subtitle") }}
        </p>
      </header>

      <div class="recovery-alternatives">
        <article
          v-for="item in section.fallbacks.alternativeBatches"
          :key="`${item.timeWindow[0]}-${item.timeWindow[1]}`"
          class="recovery-alt-row"
        >
          <div class="recovery-alt-row__meta">
            <strong>{{
              formatWindow(item.timeWindow[0], item.timeWindow[1])
            }}</strong>
            <span class="recovery-group__note">{{ item.location }}</span>
          </div>
          <button
            class="recovery-primary-btn"
            :disabled="acceptAlternativeBatchPending"
            @click="handleAcceptAlternativeBatch(item.timeWindow)"
          >
            {{ t("prPage.alternativeBatch.accept") }}
          </button>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";
import { anchorPRDetailPath } from "@/domains/pr/routing/routes";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import { trackEvent } from "@/shared/analytics/track";

type AnchorPartnerSection = AnchorPRDetailResponse["partnerSection"];
type TimeWindow = [string | null, string | null];

const props = withDefaults(
  defineProps<{
    prId: number | null;
    section: AnchorPartnerSection;
    acceptAlternativeBatchPending?: boolean;
  }>(),
  {
    acceptAlternativeBatchPending: false,
  },
);

const emit = defineEmits<{
  "accept-alternative-batch": [timeWindow: TimeWindow];
}>();

const recoveryRoot = ref<HTMLElement | null>(null);
defineExpose({
  scrollIntoView: () => {
    recoveryRoot.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  },
});

const { t } = useI18n();

const hasContent = computed(
  () =>
    props.section.fallbacks.sameBatchAlternatives.length > 0 ||
    props.section.fallbacks.alternativeBatches.length > 0,
);

const formatWindow = (start: string | null, end: string | null): string => {
  const startLabel = formatLocalDateTimeValue(start);
  const endLabel = formatLocalDateTimeValue(end);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel ?? endLabel ?? t("prPage.alternativeBatch.unknownTime");
};

const handleSameBatchClick = (targetPrId: number) => {
  if (props.prId === null) return;

  trackEvent("anchor_pr_recovery_accept", {
    prId: props.prId,
    prKind: "ANCHOR",
    targetType: "SAME_BATCH",
    targetPrId,
  });
};

const handleAcceptAlternativeBatch = (targetTimeWindow: TimeWindow) => {
  if (props.prId !== null) {
    trackEvent("anchor_pr_recovery_accept", {
      prId: props.prId,
      prKind: "ANCHOR",
      targetType: "ALTERNATIVE_BATCH",
      targetTimeWindowStart: targetTimeWindow[0],
      targetTimeWindowEnd: targetTimeWindow[1],
    });
  }
  emit("accept-alternative-batch", targetTimeWindow);
};
</script>

<style lang="scss" scoped>
.recovery-lane {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-lg);
}

.recovery-group {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.recovery-group__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-2xs);
}

.recovery-group__title {
  margin: 0;
  @include mx.pu-font(title-small);
}

.recovery-group__note {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.recovery-links,
.recovery-alternatives {
  display: flex;
  flex-direction: column;
}

.recovery-link-row,
.recovery-alt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm) 0;
  border-top: 1px solid var(--sys-color-outline-variant);
}

.recovery-link-row {
  text-decoration: none;
  color: inherit;
}

.recovery-link-row__location {
  @include mx.pu-font(body-medium);
}

.recovery-link-row__meta {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
  text-align: right;
}

.recovery-alt-row__meta {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-2xs);
  min-width: 0;
}

.recovery-primary-btn {
  @include mx.pu-font(label-large);
  @include mx.pu-rect-action(primary, default);
  border: none;
  cursor: pointer;
}

@media (max-width: 879px) {
  .recovery-alt-row {
    flex-direction: column;
    align-items: stretch;
  }

  .recovery-link-row {
    align-items: flex-start;
  }
}
</style>
