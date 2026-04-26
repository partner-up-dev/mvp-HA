<template>
  <section class="anchor-event-form-recommendation">
    <LoadingIndicator
      v-if="isInitialLoading"
      :message="t('common.loading')"
    />

    <ErrorToast
      v-else-if="resultErrorMessage"
      :message="resultErrorMessage"
      persistent
    />

    <div
      v-else-if="recommendationResult"
      class="anchor-event-form-recommendation__stack"
    >
      <section class="selection-summary">
        <div class="selection-summary__content">
          <p class="selection-summary__eyebrow">
            {{ t("anchorEvent.formMode.recommendationSummaryEyebrow") }}
          </p>
          <h2 class="selection-summary__title">
            {{ primaryCtaLabel }}
          </h2>
          <div class="selection-summary__chips">
            <Chip tone="surface" size="sm">
              {{ selectedLocationLabel }}
            </Chip>
            <Chip tone="surface" size="sm">
              {{ selectedTimeLabel }}
            </Chip>
            <Chip
              v-for="preference in props.preferences"
              :key="preference"
              tone="outline"
              size="sm"
            >
              {{ preference }}
            </Chip>
          </div>
        </div>

        <Button
          appearance="pill"
          tone="outline"
          size="sm"
          type="button"
          @click="handleModifySelection"
        >
          {{ t("anchorEvent.formMode.modifyConditions") }}
        </Button>
      </section>

      <section
        v-if="recommendationResult.primaryRecommendation"
        class="recommendation-panel recommendation-panel--primary"
      >
        <div class="recommendation-panel__header">
          <p class="recommendation-panel__eyebrow">
            {{ t("anchorEvent.formMode.primaryRecommendationEyebrow") }}
          </p>
          <h2 class="recommendation-panel__title">
            {{
              buildCandidateHeadline(
                recommendationResult.primaryRecommendation.pr.time[0],
                recommendationResult.primaryRecommendation.pr.location,
              )
            }}
          </h2>
        </div>

        <p class="recommendation-panel__meta">
          {{
            buildCandidateMeta(
              recommendationResult.primaryRecommendation.pr.partnerCount,
              recommendationResult.primaryRecommendation.pr.maxPartners,
            )
          }}
        </p>

        <div class="recommendation-panel__chips">
          <Chip
            v-for="tag in recommendationResult.primaryRecommendation.match
              .exactTagMatches"
            :key="`match-${tag}`"
            tone="primary"
            size="sm"
          >
            {{ tag }}
          </Chip>
          <Chip
            v-for="tag in recommendationResult.primaryRecommendation.match
              .conflictingTagMatches"
            :key="`conflict-${tag}`"
            tone="warning"
            size="sm"
          >
            {{ tag }}
          </Chip>
        </div>

        <div class="recommendation-panel__actions">
          <FormModeLongPressButton
            :label="t('anchorEvent.formMode.joinPrimaryRecommendation')"
            :disabled="isRoutingToJoinDetail"
            :pending="isRoutingToJoinDetail"
            :pending-label="
              t('anchorEvent.formMode.openingPrimaryRecommendation')
            "
            @complete="handleJoinPrimaryRecommendation"
          />

          <Button
            appearance="rect"
            tone="outline"
            type="button"
            @click="
              handleOpenCandidateDetail(
                recommendationResult.primaryRecommendation.pr.id,
                'PRIMARY_DETAIL',
              )
            "
          >
            {{ t("anchorEvent.formMode.viewRecommendationDetail") }}
          </Button>
        </div>
      </section>

      <section
        v-else
        class="recommendation-panel recommendation-panel--empty"
      >
        <p class="recommendation-panel__eyebrow">
          {{ t("anchorEvent.formMode.emptyRecommendationEyebrow") }}
        </p>
        <h2 class="recommendation-panel__title">
          {{ t("anchorEvent.formMode.emptyRecommendationTitle") }}
        </h2>
        <p class="recommendation-panel__body">
          {{ t("anchorEvent.formMode.emptyRecommendationBody") }}
        </p>
      </section>

      <section
        v-if="recommendationResult.orderedCandidates.length > 0"
        class="recommendation-list"
      >
        <div class="recommendation-list__header">
          <h2 class="recommendation-list__title">
            {{ t("anchorEvent.formMode.candidateListTitle") }}
          </h2>
        </div>

        <article
          v-for="(candidate, index) in recommendationResult.orderedCandidates"
          :key="candidate.pr.id"
          class="candidate-card"
        >
          <div class="candidate-card__copy">
            <p class="candidate-card__title">
              {{
                buildCandidateHeadline(
                  candidate.pr.time[0],
                  candidate.pr.location,
                )
              }}
            </p>
            <p class="candidate-card__meta">
              {{
                buildCandidateMeta(
                  candidate.pr.partnerCount,
                  candidate.pr.maxPartners,
                )
              }}
            </p>
          </div>

          <Button
            appearance="rect"
            tone="outline"
            size="sm"
            type="button"
            @click="
              handleOpenCandidateDetail(
                candidate.pr.id,
                'CANDIDATE_DETAIL',
                index + 1,
              )
            "
          >
            {{ t("anchorEvent.formMode.viewRecommendationDetail") }}
          </Button>
        </article>
      </section>

      <div class="result-actions">
        <Button
          appearance="rect"
          tone="secondary"
          type="button"
          :loading="createMutation.isPending.value"
          :disabled="!formModeData"
          @click="handleCreateFallback"
        >
          {{ t("anchorEvent.formMode.createFallbackAction") }}
        </Button>

        <Button
          appearance="rect"
          tone="outline"
          type="button"
          @click="handleViewAllSessions"
        >
          {{ t("anchorEvent.formMode.viewAllSessions") }}
        </Button>
      </div>

      <p
        v-if="createActionErrorMessage"
        class="inline-message inline-message--error"
      >
        {{ createActionErrorMessage }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import { trackEvent } from "@/shared/telemetry/track";
import { useAnchorEventFormModeData } from "@/domains/event/queries/useAnchorEventFormModeData";
import { useAnchorEventFormModeRecommendation } from "@/domains/event/queries/useAnchorEventFormModeRecommendation";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import {
  formatFormModeDateLabel,
  formatFormModeTimeLabel,
} from "@/domains/event/model/form-mode";
import { prDetailPath } from "@/domains/pr/routing/routes";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import FormModeLongPressButton from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";

const props = defineProps<{
  eventId: number;
  locationId: string;
  startAt: string;
  preferences: readonly string[];
}>();

const router = useRouter();
const { t } = useI18n();

const eventId = computed(() => props.eventId);
const formModeQuery = useAnchorEventFormModeData(eventId);
const recommendationMutation = useAnchorEventFormModeRecommendation();
const createMutation = useCreateEventAssistedPR();

const recommendationResult =
  ref<AnchorEventFormModeRecommendationResponse | null>(null);
const recommendationErrorMessage = ref<string | null>(null);
const isRoutingToJoinDetail = ref(false);
const pendingCreateReplayRunning = ref(false);
const createReplayErrorMessage = ref<string | null>(null);
const lastTrackedRecommendationKey = ref<string | null>(null);
let recommendationRequestToken = 0;

const formModeData = computed(() => formModeQuery.data.value ?? null);

const selectedLocationLabel = computed(() => {
  const selected = formModeData.value?.locations.find(
    (location) => location.id === props.locationId,
  );
  return selected?.id ?? props.locationId;
});

const selectedTimeLabel = computed(
  () =>
    `${formatFormModeDateLabel(props.startAt)} ${formatFormModeTimeLabel(
      props.startAt,
    )}`,
);

const primaryCtaLabel = computed(() =>
  t("anchorEvent.formMode.primaryCta", {
    time: selectedTimeLabel.value,
    location: selectedLocationLabel.value,
    eventTitle: formModeData.value?.event.title ?? "",
  }),
);

const isInitialLoading = computed(
  () =>
    formModeQuery.isLoading.value ||
    (recommendationMutation.isPending.value && !recommendationResult.value),
);

const resultErrorMessage = computed(() => {
  if (recommendationErrorMessage.value) {
    return recommendationErrorMessage.value;
  }
  if (formModeQuery.error.value) {
    return formModeQuery.error.value.message;
  }
  return null;
});

const createActionErrorMessage = computed(() => {
  if (createReplayErrorMessage.value) {
    return createReplayErrorMessage.value;
  }

  const error = createMutation.error.value as CreateEventAssistedPRError | null;
  if (!error) {
    return null;
  }

  switch (error.code) {
    case "ANCHOR_EVENT_NOT_FOUND":
      return t("anchorEvent.createCard.errors.eventUnavailable");
    case "WECHAT_AUTH_REQUIRED":
      return t("anchorEvent.createCard.errors.wechatAuthRequired");
    default:
      return t("anchorEvent.createCard.errors.createFailed");
  }
});

const isAdvancedStart = computed(() => {
  const options = formModeData.value?.startOptions ?? [];
  return !options.some((option) => option.startAt === props.startAt);
});

const recommendationSelectionKey = computed(() =>
  [
    props.eventId,
    props.locationId,
    props.startAt,
    ...props.preferences,
  ].join("\u001f"),
);

watch(
  recommendationSelectionKey,
  async () => {
    const requestToken = ++recommendationRequestToken;
    recommendationResult.value = null;
    recommendationErrorMessage.value = null;

    try {
      const result = await recommendationMutation.mutateAsync({
        eventId: props.eventId,
        locationId: props.locationId,
        startAt: props.startAt,
        preferences: [...props.preferences],
      });
      if (requestToken === recommendationRequestToken) {
        recommendationResult.value = result;
      }
    } catch (error) {
      if (requestToken !== recommendationRequestToken) {
        return;
      }
      recommendationErrorMessage.value =
        error instanceof Error
          ? error.message
          : t("anchorEvent.formMode.recommendationFailed");
    }
  },
  { immediate: true },
);

watch(
  [recommendationResult, formModeData],
  ([result, data]) => {
    if (!result || !data) {
      return;
    }

    const telemetryKey = recommendationSelectionKey.value;
    if (lastTrackedRecommendationKey.value === telemetryKey) {
      return;
    }

    trackEvent("anchor_event_form_recommendation_impression", {
      eventId: props.eventId,
      hasPrimaryRecommendation: Boolean(result.primaryRecommendation),
      candidateCount:
        result.orderedCandidates.length + (result.primaryRecommendation ? 1 : 0),
      advancedMode: isAdvancedStart.value,
      locationId: props.locationId,
      startAt: props.startAt,
      preferenceCount: props.preferences.length,
    });
    lastTrackedRecommendationKey.value = telemetryKey;
  },
  { immediate: true },
);

const handleModifySelection = async () => {
  await router.push({
    name: "anchor-event-landing",
    params: {
      eventId: props.eventId.toString(),
    },
  });
};

const handleViewAllSessions = async () => {
  await router.push({
    name: "anchor-event",
    params: {
      eventId: props.eventId.toString(),
    },
    query: {
      mode: "LIST",
    },
  });
};

const resolveSelectedTimeWindow = (): [string | null, string | null] => {
  const fromDefaultOption = formModeData.value?.startOptions.find(
    (option) => option.startAt === props.startAt,
  );
  if (fromDefaultOption) {
    return [fromDefaultOption.startAt, fromDefaultOption.endAt];
  }

  const durationMinutes = formModeData.value?.event.durationMinutes ?? null;
  if (durationMinutes === null) {
    return [props.startAt, null];
  }

  const endAt = new Date(
    new Date(props.startAt).getTime() + durationMinutes * 60 * 1000,
  ).toISOString();
  return [props.startAt, endAt];
};

const buildCreateFields = (): PartnerRequestFields | null => {
  const timeWindow = resolveSelectedTimeWindow();
  if (!props.locationId || !timeWindow[0] || !timeWindow[1] || !formModeData.value) {
    return null;
  }

  return {
    title: undefined,
    type: formModeData.value.event.type,
    time: timeWindow,
    location: props.locationId,
    minPartners: formModeData.value.event.defaultMinPartners ?? 2,
    maxPartners: formModeData.value.event.defaultMaxPartners ?? null,
    partners: [],
    budget: null,
    preferences: [...props.preferences],
    notes: null,
  };
};

const handleCreateFallback = async () => {
  const fields = buildCreateFields();
  if (!fields) {
    return;
  }

  trackEvent("anchor_event_form_create_fallback_click", {
    eventId: props.eventId,
    locationId: props.locationId,
    startAt: props.startAt,
    preferenceCount: props.preferences.length,
  });

  const created = await createMutation.mutateAsync({
    eventId: props.eventId,
    fields,
  });

  await router.push(
    `${created.canonicalPath}?entry=create&fromEvent=${props.eventId}`,
  );
};

const handleOpenCandidateDetail = async (
  prId: number,
  action: "PRIMARY_DETAIL" | "CANDIDATE_DETAIL",
  candidateRank: number | null = null,
) => {
  trackEvent("anchor_event_form_result_action_click", {
    eventId: props.eventId,
    action,
    prId,
    candidateRank,
  });
  await router.push(`${prDetailPath(prId)}?fromEvent=${props.eventId}`);
};

const handleJoinPrimaryRecommendation = async () => {
  const prId = recommendationResult.value?.primaryRecommendation?.pr.id ?? null;
  if (prId === null || isRoutingToJoinDetail.value) {
    return;
  }

  isRoutingToJoinDetail.value = true;
  trackEvent("anchor_event_form_join_longpress_complete", {
    eventId: props.eventId,
    prId,
  });
  window.setTimeout(async () => {
    try {
      await router.push(
        `${prDetailPath(prId)}?fromEvent=${props.eventId}&entry=landing_join`,
      );
    } finally {
      isRoutingToJoinDetail.value = false;
    }
  }, 120);
};

const buildCandidateHeadline = (
  startAt: string | null,
  location: string | null,
) => {
  const timeLabel = startAt
    ? `${formatFormModeDateLabel(startAt)} ${formatFormModeTimeLabel(startAt)}`
    : t("anchorEvent.formMode.timePlaceholder");
  const locationLabel =
    location?.trim() || t("anchorEvent.formMode.locationPlaceholder");
  return t("anchorEvent.formMode.recommendationCardHeadline", {
    time: timeLabel,
    location: locationLabel,
  });
};

const buildCandidateMeta = (
  partnerCount: number,
  maxPartners: number | null,
) => {
  if (maxPartners !== null) {
    return t("anchorEvent.formMode.partnerCountWithMax", {
      current: partnerCount,
      max: maxPartners,
    });
  }
  return t("anchorEvent.formMode.partnerCountWithoutMax", {
    current: partnerCount,
  });
};

const WECHAT_AUTH_BLOCKING_CODES = new Set([
  "WECHAT_AUTH_REQUIRED",
  "WECHAT_BIND_REQUIRED",
]);

const isWeChatAuthBlockingError = (
  error: unknown,
): error is CreateEventAssistedPRError => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as CreateEventAssistedPRError;
  return (
    apiError.status === 401 &&
    typeof apiError.code === "string" &&
    WECHAT_AUTH_BLOCKING_CODES.has(apiError.code)
  );
};

const attemptPendingCreateReplay = async () => {
  if (pendingCreateReplayRunning.value) {
    return;
  }

  const pending = readPendingWeChatAction();
  if (
    !pending ||
    pending.kind !== "EVENT_ASSISTED_PR_CREATE" ||
    pending.eventId !== props.eventId
  ) {
    return;
  }

  pendingCreateReplayRunning.value = true;
  clearPendingWeChatAction();
  try {
    const created = await createMutation.mutateAsync({
      eventId: props.eventId,
      fields: {
        title: undefined,
        type: pending.fields.type,
        time: pending.fields.time,
        location: pending.fields.location,
        minPartners: pending.fields.minPartners,
        maxPartners: pending.fields.maxPartners,
        partners: [],
        budget: null,
        preferences: pending.fields.preferences,
        notes: null,
      },
    });
    await router.push(
      `${created.canonicalPath}?entry=create&fromEvent=${props.eventId}`,
    );
  } catch (error) {
    if (!isWeChatAuthBlockingError(error)) {
      createReplayErrorMessage.value =
        error instanceof Error
          ? error.message
          : t("anchorEvent.createCard.errors.createFailed");
    }
  } finally {
    pendingCreateReplayRunning.value = false;
  }
};

onMounted(() => {
  void attemptPendingCreateReplay();
});
</script>

<style lang="scss" scoped>
.anchor-event-form-recommendation,
.anchor-event-form-recommendation__stack,
.selection-summary__content,
.recommendation-panel,
.recommendation-list,
.candidate-card {
  display: flex;
  flex-direction: column;
}

.anchor-event-form-recommendation {
  flex: 1 1 auto;
  min-height: 0;
}

.anchor-event-form-recommendation__stack {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-med);
}

.selection-summary,
.recommendation-panel,
.recommendation-list {
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-med);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface-container);
}

.selection-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.selection-summary__eyebrow,
.recommendation-panel__eyebrow {
  margin: 0;
  color: var(--sys-color-primary);
  @include mx.pu-font(label-large);
}

.selection-summary__title,
.recommendation-panel__title,
.recommendation-list__title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.selection-summary__chips,
.recommendation-panel__chips,
.recommendation-panel__actions,
.result-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.selection-summary__chips,
.recommendation-panel__chips {
  margin-top: var(--sys-spacing-xs);
}

.recommendation-panel__header,
.recommendation-list__header {
  display: flex;
  flex-direction: column;
}

.recommendation-panel__meta,
.recommendation-panel__body,
.candidate-card__title,
.candidate-card__meta,
.inline-message {
  margin: 0;
}

.recommendation-panel__meta,
.recommendation-panel__body,
.candidate-card__meta {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body-medium);
}

.recommendation-list {
  gap: var(--sys-spacing-med);
}

.candidate-card {
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface);
}

.candidate-card__copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.candidate-card__title {
  @include mx.pu-font(title-small);
}

.recommendation-panel__actions > :deep(button),
.result-actions > :deep(button) {
  flex: 1 1 14rem;
  border-radius: 0;
}

.inline-message {
  @include mx.pu-font(body-small);
}

.inline-message--error {
  color: var(--sys-color-error);
}
</style>
