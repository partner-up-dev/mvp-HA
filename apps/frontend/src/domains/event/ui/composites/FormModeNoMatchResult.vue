<template>
  <section class="form-mode-no-match-result">
    <section
      v-if="props.candidates.length > 0"
      class="candidate-list"
      data-region="form-mode-candidates"
    >
      <h2 class="candidate-list__title">
        {{ t("anchorEvent.formMode.candidateListTitle") }}
      </h2>

      <div class="candidate-list__items">
        <AnchorEventPRCard
          v-for="(candidate, index) in props.candidates"
          :key="candidate.pr.id"
          :pr="candidate.pr"
          :time-label="buildCandidateTimeLabel(candidate.pr.time[0])"
          :cover-image="props.resolveCoverImage(candidate.pr.location)"
        >
          <template #actions>
            <Button
              appearance="rect"
              type="button"
              block
              @click="emit('join-candidate', candidate.pr.id, index + 1)"
            >
              {{ t("anchorEvent.formMode.joinCandidateAction") }}
            </Button>
          </template>
        </AnchorEventPRCard>
      </div>
    </section>

    <div class="no-match-actions">
      <Button
        appearance="rect"
        tone="secondary"
        type="button"
        block
        :loading="props.createPending"
        :disabled="props.createDisabled"
        @click="emit('create-fallback')"
      >
        {{ t("anchorEvent.formMode.createFallbackAction") }}
      </Button>
    </div>

    <p
      v-if="props.createErrorMessage"
      class="inline-message inline-message--error"
    >
      {{ props.createErrorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import {
  formatFormModeDateLabel,
  formatFormModeTimeLabel,
} from "@/domains/event/model/form-mode";
import Button from "@/shared/ui/actions/Button.vue";
import AnchorEventPRCard from "@/domains/event/ui/primitives/AnchorEventPRCard.vue";

type RecommendationCandidate =
  AnchorEventFormModeRecommendationResponse["orderedCandidates"][number];

const props = defineProps<{
  candidates: readonly RecommendationCandidate[];
  createPending: boolean;
  createDisabled: boolean;
  createErrorMessage: string | null;
  resolveCoverImage: (location: string | null) => string | null;
}>();

const emit = defineEmits<{
  "join-candidate": [prId: number, rank: number];
  "create-fallback": [];
}>();

const { t } = useI18n();

const buildCandidateTimeLabel = (startAt: string | null): string | null => {
  if (!startAt) {
    return null;
  }

  return `${formatFormModeDateLabel(startAt)} ${formatFormModeTimeLabel(
    startAt,
  )}`;
};
</script>

<style lang="scss" scoped>
.form-mode-no-match-result,
.candidate-list,
.candidate-list__items {
  display: flex;
  flex-direction: column;
}

.form-mode-no-match-result {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-medium);
}

.no-match-hero__title,
.candidate-list__title,
.no-match-hero__body,
.inline-message {
  margin: 0;
}
.no-match-hero__title,
.candidate-list__title {
  @include mx.pu-font(title-medium);
}

.no-match-hero__body {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body-medium);
}

.candidate-list {
  gap: var(--sys-spacing-small);
  min-height: 0;
}

.candidate-list__items {
  gap: var(--sys-spacing-small);
}

.no-match-actions {
  margin-top: auto;
}

.inline-message {
  @include mx.pu-font(body-small);
}

.inline-message--error {
  color: var(--sys-color-error);
}
</style>
