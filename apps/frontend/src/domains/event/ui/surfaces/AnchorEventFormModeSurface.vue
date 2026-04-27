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
        <span class="form-mode-join-splash__drop form-mode-join-splash__drop--five" />
        <span class="form-mode-join-splash__drop form-mode-join-splash__drop--six" />
        <span class="form-mode-join-splash__drop form-mode-join-splash__drop--seven" />
        <span class="form-mode-join-splash__drop form-mode-join-splash__drop--eight" />
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
const defaultSelectionAppliedEventId = ref<number | null>(null);
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
  const viewportWidth =
    typeof window === "undefined" ? origin.right : window.innerWidth;
  const viewportHeight =
    typeof window === "undefined" ? origin.bottom : window.innerHeight;
  const coverRadius =
    Math.max(
      Math.hypot(centerX, centerY),
      Math.hypot(viewportWidth - centerX, centerY),
      Math.hypot(centerX, viewportHeight - centerY),
      Math.hypot(viewportWidth - centerX, viewportHeight - centerY),
    ) +
    Math.max(origin.width, origin.height) * 0.24 +
    64;
  const coverSize = coverRadius * 2;
  const startScale = Math.max(
    Math.max(origin.width, origin.height) / coverSize,
    0.045,
  );
  const drainY = viewportHeight - centerY + coverRadius + 96;

  return {
    "--join-splash-left": `${origin.left}px`,
    "--join-splash-top": `${origin.top}px`,
    "--join-splash-right": `${origin.right}px`,
    "--join-splash-bottom": `${origin.bottom}px`,
    "--join-splash-center-x": `${centerX}px`,
    "--join-splash-center-y": `${centerY}px`,
    "--join-splash-cover-size": `${coverSize}px`,
    "--join-splash-start-scale": String(startScale),
    "--join-splash-drain-y": `${drainY}px`,
    "--join-splash-drain-y-mid": `${drainY * 0.32}px`,
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
    if (!data || defaultSelectionAppliedEventId.value === data.event.id) {
      return;
    }

    defaultSelectionAppliedEventId.value = data.event.id;
    const defaultSelection = data.defaultSelection;
    if (!defaultSelection) {
      return;
    }

    const hasDefaultLocation = data.locations.some(
      (location) => location.id === defaultSelection.locationId,
    );
    if (!hasDefaultLocation) {
      return;
    }

    selectedLocationId.value = defaultSelection.locationId;
    selectedStartAt.value = defaultSelection.startAt;
  },
  { immediate: true },
);

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

.form-mode-join-splash__liquid {
  position: absolute;
  left: var(--join-splash-center-x);
  top: var(--join-splash-center-y);
  width: var(--join-splash-cover-size);
  height: var(--join-splash-cover-size);
  border-radius: 44% 56% 52% 48% / 46% 48% 52% 54%;
  background:
    radial-gradient(
      circle at 38% 34%,
      color-mix(in srgb, var(--sys-color-primary) 58%, white) 0 11%,
      transparent 30%
    ),
    radial-gradient(
      circle at 68% 58%,
      color-mix(in srgb, var(--sys-color-primary) 80%, white) 0 18%,
      transparent 44%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--sys-color-primary) 82%, white),
      var(--sys-color-primary) 42%,
      color-mix(in srgb, var(--sys-color-primary) 88%, black)
    );
  opacity: 0;
  transform: translate(-50%, -50%) scale(var(--join-splash-start-scale))
    rotate(-7deg);
  transform-origin: center;
  will-change: transform, border-radius, opacity;
}

.form-mode-join-splash__liquid::before,
.form-mode-join-splash__liquid::after {
  position: absolute;
  content: "";
  pointer-events: none;
  background: color-mix(in srgb, var(--sys-color-primary) 78%, white);
  filter: blur(0.5px);
}

.form-mode-join-splash__liquid::before {
  inset: 10% 6% 14% 12%;
  border-radius: 62% 38% 54% 46% / 42% 58% 40% 60%;
  opacity: 0.42;
  transform: rotate(18deg);
}

.form-mode-join-splash__liquid::after {
  inset: 18% 18% 9% 8%;
  border-radius: 40% 60% 44% 56% / 58% 38% 62% 42%;
  opacity: 0.26;
  transform: rotate(-24deg);
}

.form-mode-join-splash__shine {
  position: absolute;
  inset: -18%;
  opacity: 0;
  background:
    radial-gradient(
      circle at var(--join-splash-center-x) var(--join-splash-center-y),
      rgba(255, 255, 255, 0.34) 0 4%,
      transparent 19%
    ),
    conic-gradient(
      from 214deg at var(--join-splash-center-x) var(--join-splash-center-y),
      transparent 0deg,
      rgba(255, 255, 255, 0.22) 24deg,
      transparent 62deg,
      rgba(255, 255, 255, 0.16) 122deg,
      transparent 174deg,
      rgba(255, 255, 255, 0.18) 236deg,
      transparent 320deg
    );
  mix-blend-mode: screen;
  transform: scale(0.72) rotate(-10deg);
}

.form-mode-join-splash__drop {
  position: absolute;
  left: var(--join-splash-center-x);
  top: var(--join-splash-center-y);
  width: var(--join-splash-drop-size, 0.82rem);
  height: var(--join-splash-drop-size, 0.82rem);
  border-radius: var(--sys-radius-full);
  background:
    radial-gradient(
      circle at 34% 28%,
      rgba(255, 255, 255, 0.34) 0 16%,
      transparent 38%
    ),
    color-mix(in srgb, var(--sys-color-primary) 72%, white);
  filter: blur(0.15px);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.36);
}

.form-mode-join-splash__drop--one {
  --join-splash-drop-x: 13rem;
  --join-splash-drop-y: -7.4rem;
  --join-splash-drop-size: 0.9rem;
  --join-splash-drop-scale: 1.06;
}

.form-mode-join-splash__drop--two {
  --join-splash-drop-x: 8.8rem;
  --join-splash-drop-y: 6.2rem;
  --join-splash-drop-size: 0.62rem;
  --join-splash-drop-scale: 0.92;
  --join-splash-drop-delay: 34ms;
}

.form-mode-join-splash__drop--three {
  --join-splash-drop-x: -9.4rem;
  --join-splash-drop-y: -5.2rem;
  --join-splash-drop-size: 1rem;
  --join-splash-drop-scale: 1.04;
  --join-splash-drop-delay: 18ms;
}

.form-mode-join-splash__drop--four {
  --join-splash-drop-x: -6.4rem;
  --join-splash-drop-y: 7.6rem;
  --join-splash-drop-size: 0.74rem;
  --join-splash-drop-scale: 0.92;
  --join-splash-drop-delay: 74ms;
}

.form-mode-join-splash__drop--five {
  --join-splash-drop-x: 1.8rem;
  --join-splash-drop-y: -10.8rem;
  --join-splash-drop-size: 0.56rem;
  --join-splash-drop-scale: 0.78;
  --join-splash-drop-delay: 48ms;
}

.form-mode-join-splash__drop--six {
  --join-splash-drop-x: -1rem;
  --join-splash-drop-y: 10.2rem;
  --join-splash-drop-size: 0.82rem;
  --join-splash-drop-scale: 0.96;
  --join-splash-drop-delay: 96ms;
}

.form-mode-join-splash__drop--seven {
  --join-splash-drop-x: 15.4rem;
  --join-splash-drop-y: 1.8rem;
  --join-splash-drop-size: 0.48rem;
  --join-splash-drop-scale: 0.7;
  --join-splash-drop-delay: 112ms;
}

.form-mode-join-splash__drop--eight {
  --join-splash-drop-x: -13.8rem;
  --join-splash-drop-y: 1.2rem;
  --join-splash-drop-size: 0.58rem;
  --join-splash-drop-scale: 0.76;
  --join-splash-drop-delay: 62ms;
}

.form-mode-join-splash--filling .form-mode-join-splash__liquid {
  animation: form-mode-join-splash-burst 920ms
    cubic-bezier(0.12, 0.86, 0.13, 1) forwards;
}

.form-mode-join-splash--filling .form-mode-join-splash__shine {
  animation: form-mode-join-splash-shine 820ms ease-out forwards;
}

.form-mode-join-splash--filling .form-mode-join-splash__drop {
  animation: form-mode-join-splash-drop 760ms
    var(--join-splash-drop-delay, 0ms) cubic-bezier(0.1, 0.86, 0.16, 1) forwards;
}

.form-mode-join-splash--holding .form-mode-join-splash__liquid {
  opacity: 1;
  animation: form-mode-join-splash-hold 1800ms ease-in-out infinite alternate;
}

.form-mode-join-splash--holding .form-mode-join-splash__shine {
  opacity: 0.28;
  animation: form-mode-join-splash-shine 1320ms ease-in-out infinite;
}

.form-mode-join-splash--draining .form-mode-join-splash__liquid {
  opacity: 1;
  animation: form-mode-join-splash-drain 920ms
    cubic-bezier(0.52, 0, 0.24, 1) forwards;
}

@keyframes form-mode-join-splash-burst {
  0% {
    border-radius: 28% 72% 64% 36% / 42% 36% 64% 58%;
    opacity: 1;
    transform: translate(-50%, -50%) scale(var(--join-splash-start-scale))
      rotate(-7deg);
  }
  18% {
    border-radius: 66% 34% 58% 42% / 35% 62% 38% 65%;
    transform: translate(-50%, -50%) scale(0.24) rotate(10deg);
  }
  42% {
    border-radius: 40% 60% 35% 65% / 61% 44% 56% 39%;
    transform: translate(-50%, -50%) scale(0.58) rotate(-14deg);
  }
  72% {
    border-radius: 57% 43% 62% 38% / 44% 58% 42% 56%;
    transform: translate(-50%, -50%) scale(0.96) rotate(7deg);
  }
  100% {
    border-radius: 52% 48% 46% 54% / 48% 52% 50% 50%;
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.08) rotate(0deg);
  }
}

@keyframes form-mode-join-splash-hold {
  0% {
    border-radius: 52% 48% 46% 54% / 48% 52% 50% 50%;
    transform: translate(-50%, -50%) scale(1.08) rotate(0deg);
  }
  100% {
    border-radius: 45% 55% 54% 46% / 54% 44% 56% 46%;
    transform: translate(-50%, -50%) scale(1.11) rotate(-2deg);
  }
}

@keyframes form-mode-join-splash-drain {
  0% {
    border-radius: 52% 48% 46% 54% / 48% 52% 50% 50%;
    transform: translate(-50%, -50%) scale(1.1) rotate(0deg);
  }
  38% {
    border-radius: 40% 60% 52% 48% / 62% 40% 60% 38%;
    transform: translate(-50%, calc(-50% + var(--join-splash-drain-y-mid)))
      scale(1.16) rotate(3deg);
  }
  100% {
    border-radius: 46% 54% 58% 42% / 58% 44% 56% 42%;
    transform: translate(-50%, calc(-50% + var(--join-splash-drain-y)))
      scale(1.08) rotate(-4deg);
  }
}

@keyframes form-mode-join-splash-shine {
  0% {
    opacity: 0;
    transform: scale(0.7) rotate(-12deg);
  }
  35% {
    opacity: 0.34;
  }
  100% {
    opacity: 0;
    transform: scale(1.18) rotate(8deg);
  }
}

@keyframes form-mode-join-splash-drop {
  0% {
    opacity: 0.92;
    transform: translate(-50%, -50%) scale(0.3);
  }
  72% {
    opacity: 0.78;
    transform: translate(
        calc(-50% + var(--join-splash-drop-x)),
        calc(-50% + var(--join-splash-drop-y))
      )
      scale(var(--join-splash-drop-scale, 1));
  }
  100% {
    opacity: 0;
    transform: translate(
        calc(-50% + var(--join-splash-drop-x)),
        calc(-50% + var(--join-splash-drop-y))
      )
      scale(0.16);
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
    inset: 0;
    width: auto;
    height: auto;
    border-radius: 0;
    opacity: 1;
    transform: none;
  }
}
</style>
