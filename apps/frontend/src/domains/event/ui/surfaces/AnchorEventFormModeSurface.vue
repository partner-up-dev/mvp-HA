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
      <FormModeNoMatchResult
        v-if="noMatchRecommendationResult"
        :candidates="noMatchRecommendationResult.orderedCandidates"
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

    <Teleport to="body">
      <div
        v-if="joinSplashPhase !== 'IDLE'"
        class="form-mode-join-splash"
        :class="{
          'form-mode-join-splash--filling': joinSplashPhase === 'FILLING',
          'form-mode-join-splash--holding': joinSplashPhase === 'HOLDING',
          'form-mode-join-splash--draining': joinSplashPhase === 'DRAINING',
        }"
        :style="joinSplashStyle"
        aria-hidden="true"
      >
        <span class="form-mode-join-splash__liquid" />
        <span class="form-mode-join-splash__shine" />
        <span class="form-mode-join-splash__drop form-mode-join-splash__drop--one" />
        <span class="form-mode-join-splash__drop form-mode-join-splash__drop--two" />
        <span class="form-mode-join-splash__drop form-mode-join-splash__drop--three" />
        <span class="form-mode-join-splash__drop form-mode-join-splash__drop--four" />
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
import FormModeNoMatchResult from "@/domains/event/ui/composites/FormModeNoMatchResult.vue";
import FormModeLongPressButton from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";
import type { LongPressOriginRect } from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";
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

const emit = defineEmits<{
  "result-state-change": [state: "selection" | "no-match"];
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
const noMatchRecommendationResult =
  ref<AnchorEventFormModeRecommendationResponse | null>(null);
const selectionErrorMessage = ref<string | null>(null);
const createReplayErrorMessage = ref<string | null>(null);
const hasTrackedFormImpression = ref(false);
const isRoutingToMatchedRecommendation = ref(false);
const pendingCreateReplayRunning = ref(false);
type JoinSplashPhase = "IDLE" | "FILLING" | "HOLDING" | "DRAINING";

const joinSplashPhase = ref<JoinSplashPhase>("IDLE");
const joinSplashOrigin = ref<LongPressOriginRect | null>(null);
const joinSplashTimeoutIds = new Set<number>();

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
    isRoutingToMatchedRecommendation.value ||
    joinSplashPhase.value !== "IDLE",
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

const waitForJoinSplash = async (durationMs: number): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      joinSplashTimeoutIds.delete(timeoutId);
      resolve();
    }, durationMs);
    joinSplashTimeoutIds.add(timeoutId);
  });
};

const clearJoinSplashTimeouts = () => {
  if (typeof window === "undefined") {
    joinSplashTimeoutIds.clear();
    return;
  }

  for (const timeoutId of joinSplashTimeoutIds) {
    window.clearTimeout(timeoutId);
  }
  joinSplashTimeoutIds.clear();
};

const startJoinSplash = async (
  originRect: LongPressOriginRect,
): Promise<void> => {
  clearJoinSplashTimeouts();
  joinSplashOrigin.value = originRect;
  joinSplashPhase.value = "FILLING";
  await waitForJoinSplash(920);
  if (joinSplashPhase.value === "FILLING") {
    joinSplashPhase.value = "HOLDING";
  }
};

const drainJoinSplash = async (): Promise<void> => {
  if (joinSplashPhase.value === "IDLE") {
    return;
  }

  joinSplashPhase.value = "DRAINING";
  await waitForJoinSplash(920);
  if (joinSplashPhase.value === "DRAINING") {
    joinSplashPhase.value = "IDLE";
    joinSplashOrigin.value = null;
  }
};

const resetJoinSplash = () => {
  clearJoinSplashTimeouts();
  joinSplashPhase.value = "IDLE";
  joinSplashOrigin.value = null;
};

const joinSplashStyle = computed(() => {
  const origin = joinSplashOrigin.value;
  if (!origin) {
    return {};
  }

  const centerX = origin.left + origin.width / 2;
  const centerY = origin.top + origin.height / 2;

  return {
    "--join-splash-left": `${origin.left}px`,
    "--join-splash-top": `${origin.top}px`,
    "--join-splash-right": `${origin.right}px`,
    "--join-splash-bottom": `${origin.bottom}px`,
    "--join-splash-center-x": `${centerX}px`,
    "--join-splash-center-y": `${centerY}px`,
  };
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

const returnToSelection = () => {
  noMatchRecommendationResult.value = null;
  selectionErrorMessage.value = null;
};

defineExpose({
  returnToSelection,
});

watch([selectedLocationId, selectedStartAt, selectedPreferences], () => {
  returnToSelection();
});

watch(
  noMatchRecommendationResult,
  (result) => {
    emit("result-state-change", result ? "no-match" : "selection");
  },
  { immediate: true },
);

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
    hasMatchedRecommendation: Boolean(result.matchedRecommendation),
    candidateCount:
      result.orderedCandidates.length + (result.matchedRecommendation ? 1 : 0),
    advancedMode: isAdvancedStartValue(startAt),
    locationId,
    startAt,
    preferenceCount: selectedPreferences.value.length,
  });
};

const routeToPRJoin = async (
  prId: number,
  action: "MATCHED_JOIN" | "CANDIDATE_JOIN",
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

const handleSubmitRecommendation = async (originRect: LongPressOriginRect) => {
  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !startAt) {
    return;
  }

  returnToSelection();
  const splashFill = startJoinSplash(originRect);

  try {
    const result = await recommendationMutation.mutateAsync({
      eventId: props.eventId,
      locationId,
      startAt,
      preferences: [...selectedPreferences.value],
    });
    trackRecommendationExposure(result);

    const matchedPRId = result.matchedRecommendation?.pr.id ?? null;
    trackEvent("anchor_event_form_join_longpress_complete", {
      eventId: props.eventId,
      prId: matchedPRId,
      locationId,
      startAt,
      preferenceCount: selectedPreferences.value.length,
    });

    if (matchedPRId !== null) {
      isRoutingToMatchedRecommendation.value = true;
      await splashFill;
      await waitForJoinSplash(140);
      await routeToPRJoin(matchedPRId, "MATCHED_JOIN").finally(() => {
        isRoutingToMatchedRecommendation.value = false;
      });
      return;
    }

    noMatchRecommendationResult.value = result;
    await splashFill;
    await drainJoinSplash();
  } catch (error) {
    selectionErrorMessage.value =
      error instanceof Error
        ? error.message
        : t("anchorEvent.formMode.recommendationFailed");
    await splashFill;
    await drainJoinSplash();
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

onBeforeUnmount(() => {
  resetJoinSplash();
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

.form-mode-join-splash {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overflow: hidden;
  pointer-events: none;
}

.form-mode-join-splash__liquid,
.form-mode-join-splash__shine {
  position: absolute;
  inset: 0;
}

.form-mode-join-splash__liquid {
  background:
    radial-gradient(
      circle at var(--join-splash-center-x) var(--join-splash-center-y),
      color-mix(in srgb, var(--sys-color-primary) 72%, white) 0 9%,
      transparent 22%
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--sys-color-primary) 82%, white),
      var(--sys-color-primary) 42%,
      color-mix(in srgb, var(--sys-color-primary) 88%, black)
    );
  clip-path: polygon(
    var(--join-splash-left) var(--join-splash-top),
    var(--join-splash-right) var(--join-splash-top),
    var(--join-splash-right) var(--join-splash-bottom),
    var(--join-splash-left) var(--join-splash-bottom)
  );
}

.form-mode-join-splash__shine {
  opacity: 0;
  background: linear-gradient(
    115deg,
    transparent 0 34%,
    rgba(255, 255, 255, 0.26) 44%,
    transparent 58% 100%
  );
  transform: translateX(-100%);
}

.form-mode-join-splash__drop {
  position: absolute;
  left: var(--join-splash-center-x);
  top: var(--join-splash-center-y);
  width: 0.82rem;
  height: 0.82rem;
  border-radius: var(--sys-radius-full);
  background: color-mix(in srgb, var(--sys-color-primary) 72%, white);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.36);
}

.form-mode-join-splash__drop--two {
  width: 0.56rem;
  height: 0.56rem;
}

.form-mode-join-splash__drop--three {
  width: 1rem;
  height: 1rem;
}

.form-mode-join-splash__drop--four {
  width: 0.68rem;
  height: 0.68rem;
}

.form-mode-join-splash--filling .form-mode-join-splash__liquid {
  animation: form-mode-join-splash-fill 920ms
    cubic-bezier(0.14, 0.82, 0.18, 1) forwards;
}

.form-mode-join-splash--filling .form-mode-join-splash__shine {
  animation: form-mode-join-splash-shine 720ms ease-out forwards;
}

.form-mode-join-splash--filling .form-mode-join-splash__drop--one {
  animation: form-mode-join-splash-drop-one 860ms ease-out forwards;
}

.form-mode-join-splash--filling .form-mode-join-splash__drop--two {
  animation: form-mode-join-splash-drop-two 820ms 40ms ease-out forwards;
}

.form-mode-join-splash--filling .form-mode-join-splash__drop--three {
  animation: form-mode-join-splash-drop-three 900ms 20ms ease-out forwards;
}

.form-mode-join-splash--filling .form-mode-join-splash__drop--four {
  animation: form-mode-join-splash-drop-four 820ms 80ms ease-out forwards;
}

.form-mode-join-splash--holding .form-mode-join-splash__liquid {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}

.form-mode-join-splash--holding .form-mode-join-splash__shine {
  opacity: 0.28;
  animation: form-mode-join-splash-shine 1320ms ease-in-out infinite;
}

.form-mode-join-splash--draining .form-mode-join-splash__liquid {
  animation: form-mode-join-splash-drain 920ms
    cubic-bezier(0.52, 0, 0.24, 1) forwards;
}

@keyframes form-mode-join-splash-fill {
  0% {
    clip-path: polygon(
      var(--join-splash-left) var(--join-splash-top),
      var(--join-splash-right) var(--join-splash-top),
      var(--join-splash-right) var(--join-splash-bottom),
      var(--join-splash-left) var(--join-splash-bottom)
    );
  }
  34% {
    clip-path: polygon(
      var(--join-splash-left) var(--join-splash-top),
      100% var(--join-splash-top),
      100% var(--join-splash-bottom),
      var(--join-splash-left) var(--join-splash-bottom)
    );
  }
  62% {
    clip-path: polygon(
      0 0,
      100% 0,
      100% var(--join-splash-bottom),
      0 var(--join-splash-bottom)
    );
  }
  100% {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}

@keyframes form-mode-join-splash-drain {
  0% {
    clip-path: polygon(
      0 0,
      12% 0,
      24% 0,
      36% 0,
      50% 0,
      64% 0,
      80% 0,
      100% 0,
      100% 100%,
      0 100%
    );
  }
  34% {
    clip-path: polygon(
      0 18%,
      12% 12%,
      24% 20%,
      36% 14%,
      50% 23%,
      64% 15%,
      80% 21%,
      100% 16%,
      100% 100%,
      0 100%
    );
  }
  100% {
    clip-path: polygon(
      0 112%,
      12% 106%,
      24% 114%,
      36% 108%,
      50% 117%,
      64% 109%,
      80% 115%,
      100% 110%,
      100% 100%,
      0 100%
    );
  }
}

@keyframes form-mode-join-splash-shine {
  0% {
    opacity: 0;
    transform: translateX(-100%);
  }
  35% {
    opacity: 0.34;
  }
  100% {
    opacity: 0;
    transform: translateX(100%);
  }
}

@keyframes form-mode-join-splash-drop-one {
  0% {
    opacity: 0.92;
    transform: translate(-50%, -50%) scale(0.36);
  }
  72% {
    opacity: 0.82;
    transform: translate(calc(-50% + 9rem), calc(-50% - 6.5rem)) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + 12rem), calc(-50% - 7.6rem)) scale(0.28);
  }
}

@keyframes form-mode-join-splash-drop-two {
  0% {
    opacity: 0.88;
    transform: translate(-50%, -50%) scale(0.32);
  }
  74% {
    opacity: 0.72;
    transform: translate(calc(-50% + 6.8rem), calc(-50% + 4.6rem)) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + 10rem), calc(-50% + 5.4rem)) scale(0.18);
  }
}

@keyframes form-mode-join-splash-drop-three {
  0% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(0.28);
  }
  70% {
    opacity: 0.78;
    transform: translate(calc(-50% + 14rem), calc(-50% - 1.7rem)) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + 17rem), calc(-50% - 2.8rem)) scale(0.22);
  }
}

@keyframes form-mode-join-splash-drop-four {
  0% {
    opacity: 0.88;
    transform: translate(-50%, -50%) scale(0.3);
  }
  72% {
    opacity: 0.72;
    transform: translate(calc(-50% + 4.2rem), calc(-50% - 8.6rem)) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + 6rem), calc(-50% - 10rem)) scale(0.2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .form-mode-join-splash--filling .form-mode-join-splash__liquid,
  .form-mode-join-splash--holding .form-mode-join-splash__shine,
  .form-mode-join-splash--draining .form-mode-join-splash__liquid,
  .form-mode-join-splash--filling .form-mode-join-splash__drop {
    animation: none;
  }

  .form-mode-join-splash__liquid {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}
</style>
