<template>
  <section class="anchor-event-form-mode">
    <LoadingIndicator
      v-if="formModeQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <ErrorToast
      v-else-if="formModeQuery.error.value"
      :message="formModeQuery.error.value.message"
      persistent
    />

    <div v-else-if="formModeData" class="anchor-event-form-mode__stack">
      <FormModeNoPrimaryResult
        v-if="noPrimaryRecommendationResult"
        :candidates="noPrimaryRecommendationResult.orderedCandidates"
        :create-pending="createMutation.isPending.value"
        :create-disabled="!canCreateFallback"
        :create-error-message="createActionErrorMessage"
        :resolve-cover-image="resolveCoverImage"
        @join-candidate="handleJoinCandidate"
        @create-fallback="handleCreateFallback"
      />

      <div v-else class="form-mode-selection">
        <FormModeLocationControl
          v-model="selectedLocationId"
          :locations="formModeData.locations"
        />

        <FormModeTimeControl
          v-model="selectedStartAt"
          :start-options="formModeData.startOptions"
          :duration-minutes="formModeData.event.durationMinutes"
          :earliest-lead-minutes="formModeData.event.earliestLeadMinutes"
        />

        <FormModePreferenceControl
          v-model="selectedPreferences"
          :event-id="props.eventId"
          :preset-tags="formModeData.presetTags"
        />

        <p
          v-if="selectionErrorMessage"
          class="inline-message inline-message--error"
        >
          {{ selectionErrorMessage }}
        </p>

        <div class="form-actions">
          <Button
            appearance="rect"
            tone="outline"
            type="button"
            @click="handleViewAllSessions"
          >
            {{ t("anchorEvent.formMode.viewAllSessions") }}
          </Button>

          <FormModeLongPressButton
            :label="primaryCtaLabel"
            :pending="recommendationSubmissionPending"
            :pending-label="t('anchorEvent.formMode.primaryCtaPending')"
            :disabled="!canSubmitRecommendation"
            @complete="handleSubmitRecommendation"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import { trackEvent } from "@/shared/telemetry/track";
import { useAnchorEventFormModeData } from "@/domains/event/queries/useAnchorEventFormModeData";
import { useAnchorEventFormModeRecommendation } from "@/domains/event/queries/useAnchorEventFormModeRecommendation";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import FormModeLocationControl from "@/domains/event/ui/controls/form-mode/FormModeLocationControl.vue";
import FormModeTimeControl from "@/domains/event/ui/controls/form-mode/FormModeTimeControl.vue";
import FormModePreferenceControl from "@/domains/event/ui/controls/form-mode/FormModePreferenceControl.vue";
import FormModeNoPrimaryResult from "@/domains/event/ui/composites/FormModeNoPrimaryResult.vue";
import FormModeLongPressButton from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";
import {
  formatFormModeDateLabel,
  formatFormModeTimeLabel,
  pickStableGalleryImage,
} from "@/domains/event/model/form-mode";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import { prDetailPath } from "@/domains/pr/routing/routes";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";

const props = defineProps<{
  eventId: number;
}>();

const router = useRouter();
const { t } = useI18n();

const eventId = computed(() => props.eventId);
const formModeQuery = useAnchorEventFormModeData(eventId);
const recommendationMutation = useAnchorEventFormModeRecommendation();
const createMutation = useCreateEventAssistedPR();

const selectedLocationId = ref<string | null>(null);
const selectedStartAt = ref<string | null>(null);
const selectedPreferences = ref<string[]>([]);
const noPrimaryRecommendationResult =
  ref<AnchorEventFormModeRecommendationResponse | null>(null);
const selectionErrorMessage = ref<string | null>(null);
const createReplayErrorMessage = ref<string | null>(null);
const hasTrackedFormImpression = ref(false);
const isRoutingToPrimaryRecommendation = ref(false);
const pendingCreateReplayRunning = ref(false);

const formModeData = computed(() => formModeQuery.data.value ?? null);

const selectedLocationLabel = computed(() => {
  const selected = formModeData.value?.locations.find(
    (location) => location.id === selectedLocationId.value,
  );
  return selected?.id ?? t("anchorEvent.formMode.locationPlaceholder");
});

const selectedTimeLabel = computed(() => {
  if (!selectedStartAt.value) {
    return t("anchorEvent.formMode.timePlaceholder");
  }
  return `${formatFormModeDateLabel(selectedStartAt.value)} ${formatFormModeTimeLabel(
    selectedStartAt.value,
  )}`;
});

const primaryCtaLabel = computed(() => {
  if (!selectedStartAt.value || !selectedLocationId.value) {
    return t("anchorEvent.formMode.primaryCtaFallback");
  }
  return t("anchorEvent.formMode.primaryCta", {
    time: selectedTimeLabel.value,
    location: selectedLocationLabel.value,
    eventTitle: formModeData.value?.event.title ?? "",
  });
});

const recommendationSubmissionPending = computed(
  () =>
    recommendationMutation.isPending.value ||
    isRoutingToPrimaryRecommendation.value,
);

const canSubmitRecommendation = computed(() =>
  Boolean(
    selectedLocationId.value &&
      selectedStartAt.value &&
      !recommendationSubmissionPending.value,
  ),
);

const canCreateFallback = computed(() =>
  Boolean(selectedLocationId.value && selectedStartAt.value && formModeData.value),
);

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

watch(
  formModeData,
  (data) => {
    if (!data || hasTrackedFormImpression.value) {
      return;
    }

    trackEvent("anchor_event_form_impression", {
      eventId: props.eventId,
    });
    hasTrackedFormImpression.value = true;
  },
  { immediate: true },
);

watch([selectedLocationId, selectedStartAt, selectedPreferences], () => {
  noPrimaryRecommendationResult.value = null;
  selectionErrorMessage.value = null;
});

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

const resolveCoverImage = (location: string | null): string | null => {
  if (!location) {
    return null;
  }

  const matchedLocation = formModeData.value?.locations.find(
    (item) => item.id === location,
  );
  return pickStableGalleryImage(matchedLocation?.gallery ?? [], location);
};

const isAdvancedStartValue = (startAt: string): boolean => {
  const options = formModeData.value?.startOptions ?? [];
  return !options.some((option) => option.startAt === startAt);
};

const trackRecommendationExposure = (
  result: AnchorEventFormModeRecommendationResponse,
) => {
  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !startAt) {
    return;
  }

  trackEvent("anchor_event_form_recommendation_impression", {
    eventId: props.eventId,
    hasPrimaryRecommendation: Boolean(result.primaryRecommendation),
    candidateCount:
      result.orderedCandidates.length + (result.primaryRecommendation ? 1 : 0),
    advancedMode: isAdvancedStartValue(startAt),
    locationId,
    startAt,
    preferenceCount: selectedPreferences.value.length,
  });
};

const routeToPRJoin = async (
  prId: number,
  action: "PRIMARY_JOIN" | "CANDIDATE_JOIN",
  candidateRank: number | null = null,
) => {
  trackEvent("anchor_event_form_result_action_click", {
    eventId: props.eventId,
    action,
    prId,
    candidateRank,
  });

  await router.push(
    `${prDetailPath(prId)}?fromEvent=${props.eventId}&entry=landing_join`,
  );
};

const handleSubmitRecommendation = async () => {
  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !startAt) {
    return;
  }

  selectionErrorMessage.value = null;
  noPrimaryRecommendationResult.value = null;

  try {
    const result = await recommendationMutation.mutateAsync({
      eventId: props.eventId,
      locationId,
      startAt,
      preferences: [...selectedPreferences.value],
    });
    trackRecommendationExposure(result);

    const primaryPRId = result.primaryRecommendation?.pr.id ?? null;
    trackEvent("anchor_event_form_join_longpress_complete", {
      eventId: props.eventId,
      prId: primaryPRId,
      locationId,
      startAt,
      preferenceCount: selectedPreferences.value.length,
    });

    if (primaryPRId !== null) {
      isRoutingToPrimaryRecommendation.value = true;
      window.setTimeout(() => {
        void routeToPRJoin(primaryPRId, "PRIMARY_JOIN").finally(() => {
          isRoutingToPrimaryRecommendation.value = false;
        });
      }, 120);
      return;
    }

    noPrimaryRecommendationResult.value = result;
  } catch (error) {
    selectionErrorMessage.value =
      error instanceof Error
        ? error.message
        : t("anchorEvent.formMode.recommendationFailed");
  }
};

const resolveSelectedTimeWindow = (): [string | null, string | null] => {
  if (!selectedStartAt.value) {
    return [null, null];
  }

  const defaultOption = formModeData.value?.startOptions.find(
    (option) => option.startAt === selectedStartAt.value,
  );
  if (defaultOption) {
    return [defaultOption.startAt, defaultOption.endAt];
  }

  const durationMinutes = formModeData.value?.event.durationMinutes ?? null;
  if (durationMinutes === null) {
    return [selectedStartAt.value, null];
  }

  const endAt = new Date(
    new Date(selectedStartAt.value).getTime() + durationMinutes * 60 * 1000,
  ).toISOString();
  return [selectedStartAt.value, endAt];
};

const buildCreateFields = (): PartnerRequestFields | null => {
  const timeWindow = resolveSelectedTimeWindow();
  if (!selectedLocationId.value || !timeWindow[0] || !timeWindow[1]) {
    return null;
  }
  if (!formModeData.value) {
    return null;
  }

  return {
    title: undefined,
    type: formModeData.value.event.type,
    time: timeWindow,
    location: selectedLocationId.value,
    minPartners: formModeData.value.event.defaultMinPartners ?? 2,
    maxPartners: formModeData.value.event.defaultMaxPartners ?? null,
    partners: [],
    budget: null,
    preferences: [...selectedPreferences.value],
    notes: null,
  };
};

const handleCreateFallback = async () => {
  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !startAt) {
    return;
  }

  const fields = buildCreateFields();
  if (!fields) {
    return;
  }

  trackEvent("anchor_event_form_create_fallback_click", {
    eventId: props.eventId,
    locationId,
    startAt,
    preferenceCount: selectedPreferences.value.length,
  });

  try {
    const created = await createMutation.mutateAsync({
      eventId: props.eventId,
      fields,
    });

    await router.push(
      `${created.canonicalPath}?entry=create&fromEvent=${props.eventId}`,
    );
  } catch (error) {
    if (isWeChatAuthBlockingError(error)) {
      return;
    }
  }
};

const handleJoinCandidate = async (prId: number, rank: number) => {
  await routeToPRJoin(prId, "CANDIDATE_JOIN", rank);
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
.anchor-event-form-mode,
.anchor-event-form-mode__stack,
.form-mode-selection {
  display: flex;
  flex-direction: column;
}

.anchor-event-form-mode {
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: var(--sys-spacing-large);
}

.anchor-event-form-mode__stack {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-medium);
}

.form-mode-selection {
  flex: 1 1 auto;
  min-height: 0;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.form-actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: var(--sys-spacing-small);
}

.form-actions > :deep(button) {
  flex: 1 1 14rem;
  border-radius: 0;
}

.inline-message {
  margin: 0;
  @include mx.pu-font(body-small);
}

.inline-message--error {
  color: var(--sys-color-error);
}
</style>
