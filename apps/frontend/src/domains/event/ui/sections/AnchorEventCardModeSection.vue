<template>
  <div v-if="activeDemandCard" class="card-mode" data-region="anchor-pr-list">
    <div class="card-stage">
      <div class="card-stage__label-rail" aria-hidden="true">
        <span
          class="card-stage__projection-label card-stage__projection-label--left"
          :style="leftPromptStyle"
        >
          {{ t("anchorEvent.card.swipeSkipHint") }}
        </span>
        <span
          class="card-stage__projection-label card-stage__projection-label--right"
          :style="rightPromptStyle"
        >
          {{ t("anchorEvent.card.swipeDetailHint") }}
        </span>
      </div>

      <div class="card-stage__inner">
        <div
          class="card-stage__projection-layer card-stage__projection-layer--underlay"
          aria-hidden="true"
        >
          <span
            class="card-stage__projection-side card-stage__projection-side--left"
            :style="leftProjectionShellStyle"
          >
            <span
              class="card-stage__projection-light"
              :style="leftProjectionLightStyle"
            >
              <span class="card-stage__projection-source" />
              <span class="card-stage__projection-bloom" />
              <span class="card-stage__projection-rim" />
              <span class="card-stage__projection-spill" />
            </span>
          </span>
          <span
            class="card-stage__projection-side card-stage__projection-side--right"
            :style="rightProjectionShellStyle"
          >
            <span
              class="card-stage__projection-light"
              :style="rightProjectionLightStyle"
            >
              <span class="card-stage__projection-source" />
              <span class="card-stage__projection-bloom" />
              <span class="card-stage__projection-rim" />
              <span class="card-stage__projection-spill" />
            </span>
          </span>
        </div>

        <AnchorEventDemandCard
          v-for="(previewCard, previewIndex) in stackPreviewCards"
          :key="`preview-${previewCard.cardKey}`"
          class="card-stack-preview"
          :style="{
            zIndex: 2 - previewIndex,
            animationDelay: `${70 + previewIndex * 40}ms`,
          }"
          :display-location-name="previewCard.displayLocationName"
          :time-label="previewCard.timeLabel"
          :preference-tags="previewCard.preferenceTags"
          :notes="previewCard.notes"
          :cover-image="previewCard.coverImage"
          :detail-pr-id="previewCard.detailPrId"
          :preview="true"
          :preview-depth="previewIndex + 1"
          aria-hidden="true"
        />

        <div class="card-stage__front-shell" :key="activeDemandCard.cardKey">
          <AnchorEventDemandCard
            ref="frontDemandCardRef"
            class="card-stage__front"
            :display-location-name="activeDemandCard.displayLocationName"
            :time-label="activeDemandCard.timeLabel"
            :preference-tags="activeDemandCard.preferenceTags"
            :notes="activeDemandCard.notes"
            :cover-image="activeDemandCard.coverImage"
            :detail-pr-id="activeDemandCard.detailPrId"
            :pending="isCardRouting"
            @swipe-preview="handleSwipePreview"
            @skip="emitSkipActiveCard"
            @view-detail="emitViewActiveCardDetail"
          />
        </div>
      </div>
    </div>

    <div class="card-mode__actions">
      <Button
        type="button"
        class="card-mode__action"
        appearance="pill"
        tone="danger"
        :disabled="isCardRouting"
        @click="handleSkipActionClick"
      >
        {{ t("anchorEvent.card.skipButton") }}
      </Button>
      <Button
        type="button"
        class="card-mode__action"
        appearance="pill"
        :disabled="isCardRouting || activeDemandCard.detailPrId === null"
        @click="handleViewActionClick"
      >
        {{ t("anchorEvent.card.detailButton") }}
      </Button>
    </div>

    <p v-if="cardActionError" class="card-mode__error">
      {{ cardActionError }}
    </p>
  </div>

  <div v-else class="card-empty-stack">
    <div class="card-empty">
      <p class="card-empty__title">
        {{ t("anchorEvent.card.emptyTitle") }}
      </p>
      <p class="card-empty__subtitle">
        {{ t("anchorEvent.card.emptySubtitle") }}
      </p>

      <div class="card-empty__create" data-region="create-anchor-pr">
        <label
          v-if="cardCreateBatchOptions.length > 0"
          class="card-empty__field"
        >
          <span class="card-empty__label">{{
            t("anchorEvent.card.batchLabel")
          }}</span>
          <select
            :value="cardCreateBatchId ?? ''"
            class="card-empty__input"
            @change="handleCardCreateBatchChange"
          >
            <option
              v-for="option in cardCreateBatchOptions"
              :key="option.batchId"
              :value="option.batchId"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label
          v-if="cardCreateBatchOptions.length > 0"
          class="card-empty__field"
        >
          <span class="card-empty__label">{{
            t("anchorEvent.createCard.locationLabel")
          }}</span>
          <select
            :value="cardCreateLocationId"
            class="card-empty__input"
            @change="handleCardCreateLocationChange"
          >
            <option
              v-for="option in cardCreateLocationOptions"
              :key="option.locationId"
              :value="option.locationId"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <p v-if="createActionErrorMessage" class="card-empty__error">
          {{ createActionErrorMessage }}
        </p>

        <Button
          type="button"
          appearance="pill"
          size="sm"
          :disabled="isCreatePending"
          @click="emitCreateFromCardEmpty"
        >
          {{
            isCreatePending
              ? t("anchorEvent.createCard.creatingAction")
              : t("anchorEvent.createCard.createAction")
          }}
        </Button>
      </div>

      <OtherAnchorEventsSection
        :current-event-id="eventId"
        variant="embedded"
        data-region="discover-other-events"
      />
    </div>

    <AnchorEventBetaGroupCard
      :event-id="eventId"
      :event-title="eventTitle"
      :qr-code-url="eventBetaGroupQrCode"
      :default-expanded="true"
      variant="card"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AnchorEventDemandCard from "@/domains/event/ui/primitives/AnchorEventDemandCard.vue";
import AnchorEventBetaGroupCard from "@/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue";
import OtherAnchorEventsSection from "@/domains/event/ui/sections/OtherAnchorEventsSection.vue";
import Button from "@/shared/ui/actions/Button.vue";
import {
  DEMAND_CARD_EXIT_TIMING,
  DEMAND_CARD_REBOUND_TIMING,
  clampDemandCardSwipePreviewIntensity,
  createIdleDemandCardSwipePreviewState,
  type DemandCardSwipePreviewState,
} from "@/domains/event/ui/demand-card-swipe-feedback";

type DemandCardViewModel = {
  cardKey: string;
  timeLabel: string;
  displayLocationName: string;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  coverImage: string | null;
};

type CardBatchOption = {
  batchId: number;
  label: string;
};

type CardCreateLocationOption = {
  locationId: string;
  label: string;
  disabled: boolean;
};

type FrontDemandCardHandle = {
  triggerAction: (action: "skip" | "view-detail") => void;
  playHintWobble: () => void;
};

const props = defineProps<{
  activeDemandCard: DemandCardViewModel | null;
  stackPreviewCards: DemandCardViewModel[];
  isCardRouting: boolean;
  cardActionError: string | null;
  dragHintToken: number;
  cardCreateBatchOptions: CardBatchOption[];
  cardCreateBatchId: number | null;
  cardCreateLocationId: string;
  cardCreateLocationOptions: CardCreateLocationOption[];
  createActionErrorMessage: string | null;
  isCreatePending: boolean;
  eventId: number;
  eventTitle: string;
  eventBetaGroupQrCode: string | null;
}>();

const emit = defineEmits<{
  "consume-drag-hint-window": [];
  "skip-active-card": [];
  "view-active-card-detail": [];
  "update:cardCreateBatchId": [value: number | null];
  "update:cardCreateLocationId": [value: string];
  "create-from-card-empty": [];
}>();

const { t } = useI18n();
const frontDemandCardRef = ref<FrontDemandCardHandle | null>(null);
const swipePreviewState = ref<DemandCardSwipePreviewState>(
  createIdleDemandCardSwipePreviewState(),
);
const hasConsumedDragHintWindow = ref(false);

const swipePreviewIntensity = computed(() =>
  clampDemandCardSwipePreviewIntensity(swipePreviewState.value.intensity),
);
const swipePreviewPhase = computed(() => swipePreviewState.value.phase);
const swipePreviewAnchorCorner = computed(
  () => swipePreviewState.value.anchorCorner,
);
const swipePreviewMagnitude = computed(() =>
  Math.min(Math.abs(swipePreviewIntensity.value), 1),
);
const easeOutCurve = (value: number, power: number) => {
  const clamped = Math.min(Math.max(value, 0), 1);
  return 1 - Math.pow(1 - clamped, power);
};
const promptStrength = computed(() =>
  easeOutCurve(swipePreviewMagnitude.value, 2.18),
);
const projectionActivation = computed(() => {
  const magnitude = swipePreviewMagnitude.value;
  if (magnitude <= 0.02) {
    return 0;
  }

  return easeOutCurve((magnitude - 0.02) / 0.98, 2.26);
});
const projectionSpread = computed(() =>
  easeOutCurve(swipePreviewMagnitude.value, 1.72),
);
const projectionThresholdTension = computed(() => {
  const magnitude = swipePreviewMagnitude.value;
  if (magnitude <= 0.72) {
    return 0;
  }

  return Math.pow((magnitude - 0.72) / 0.28, 1.55);
});
const projectionCornerSlot = computed<"top" | "bottom">(() => {
  return swipePreviewAnchorCorner.value ?? "top";
});

const feedbackTransition = computed(() => {
  switch (swipePreviewPhase.value) {
    case "dragging":
      return "none";
    case "exiting":
      return `opacity ${DEMAND_CARD_EXIT_TIMING}, transform ${DEMAND_CARD_EXIT_TIMING}`;
    case "rebounding":
      return `opacity ${DEMAND_CARD_REBOUND_TIMING}, transform ${DEMAND_CARD_REBOUND_TIMING}`;
    default:
      return "opacity 180ms ease-out, transform 180ms ease-out";
  }
});

const buildPromptStyle = (direction: "left" | "right") => {
  if (swipePreviewPhase.value === "hinting") {
    return {
      opacity: 0,
      transform: "translate3d(0, 16px, 0) scale(0.96)",
      transition: feedbackTransition.value,
    };
  }

  const active =
    direction === "left"
      ? swipePreviewIntensity.value < 0
      : swipePreviewIntensity.value > 0;
  const strength = active ? promptStrength.value : 0;

  return {
    opacity: strength * 0.96,
    transform: `translate3d(0, ${16 - strength * 16}px, 0) scale(${0.96 + strength * 0.08})`,
    transition: feedbackTransition.value,
  };
};

const buildProjectionShellStyle = (direction: "left" | "right") => {
  const slotY = projectionCornerSlot.value === "top" ? "23%" : "71%";
  const horizontalOffset = direction === "left" ? "-74%" : "74%";

  return {
    top: slotY,
    transform: `translate3d(${horizontalOffset}, -50%, 0)`,
    transition: feedbackTransition.value,
  };
};

const buildProjectionLightStyle = (direction: "left" | "right") => {
  const active =
    direction === "left"
      ? swipePreviewIntensity.value < 0
      : swipePreviewIntensity.value > 0;
  const activation = active ? projectionActivation.value : 0;
  const spread = active ? projectionSpread.value : 0;
  const thresholdTension = active ? projectionThresholdTension.value : 0;
  const scaleX = 1.2 + spread * 1.28 + thresholdTension * 0.62;
  const scaleY = 0.98 + spread * 0.88 + thresholdTension * 0.36;
  const opacity = activation * 0.84 + thresholdTension * 0.12;
  const sourceOpacity = 0.18 + activation * 0.42 + thresholdTension * 0.18;
  const bloomOpacity = 0.14 + activation * 0.58 + thresholdTension * 0.22;
  const rimOpacity = activation * 0.16 + thresholdTension * 0.44;
  const spillOpacity = activation * 0.24 + thresholdTension * 0.46;
  const tilt = direction === "left" ? "-6deg" : "6deg";

  return {
    opacity,
    transform: `scale(${scaleX}, ${scaleY}) rotate(${tilt})`,
    transition: feedbackTransition.value,
    "--card-stage-projection-source-opacity": sourceOpacity.toString(),
    "--card-stage-projection-bloom-opacity": bloomOpacity.toString(),
    "--card-stage-projection-rim-opacity": rimOpacity.toString(),
    "--card-stage-projection-spill-opacity": spillOpacity.toString(),
  };
};

const leftPromptStyle = computed(() => buildPromptStyle("left"));
const rightPromptStyle = computed(() => buildPromptStyle("right"));
const leftProjectionShellStyle = computed(() =>
  buildProjectionShellStyle("left"),
);
const rightProjectionShellStyle = computed(() =>
  buildProjectionShellStyle("right"),
);
const leftProjectionLightStyle = computed(() =>
  buildProjectionLightStyle("left"),
);
const rightProjectionLightStyle = computed(() =>
  buildProjectionLightStyle("right"),
);

const handleSwipePreview = (previewState: DemandCardSwipePreviewState) => {
  if (
    !hasConsumedDragHintWindow.value &&
    previewState.phase !== "idle" &&
    previewState.phase !== "hinting"
  ) {
    hasConsumedDragHintWindow.value = true;
    emit("consume-drag-hint-window");
  }

  swipePreviewState.value = {
    intensity: clampDemandCardSwipePreviewIntensity(previewState.intensity),
    phase: previewState.phase,
    anchorViewportY: previewState.anchorViewportY,
    anchorCorner: previewState.anchorCorner,
  };
};

const emitSkipActiveCard = () => {
  emit("skip-active-card");
};

const emitViewActiveCardDetail = () => {
  emit("view-active-card-detail");
};

const handleSkipActionClick = () => {
  if (frontDemandCardRef.value) {
    frontDemandCardRef.value.triggerAction("skip");
    return;
  }

  emitSkipActiveCard();
};

const handleViewActionClick = () => {
  if (frontDemandCardRef.value) {
    frontDemandCardRef.value.triggerAction("view-detail");
    return;
  }

  emitViewActiveCardDetail();
};

const emitCreateFromCardEmpty = () => {
  emit("create-from-card-empty");
};

const handleCardCreateBatchChange = (event: Event) => {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const nextValue = Number(select.value);
  if (!Number.isFinite(nextValue)) {
    emit("update:cardCreateBatchId", null);
    return;
  }

  emit("update:cardCreateBatchId", nextValue);
};

const handleCardCreateLocationChange = (event: Event) => {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  emit("update:cardCreateLocationId", select.value);
};

watch(
  () => props.activeDemandCard?.cardKey ?? null,
  () => {
    swipePreviewState.value = createIdleDemandCardSwipePreviewState();
  },
);

watch(
  () => props.dragHintToken,
  (token, previousToken) => {
    if (token === previousToken || token <= 0) {
      return;
    }

    frontDemandCardRef.value?.playHintWobble();
  },
);
</script>

<style lang="scss" scoped>
.card-mode {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  min-height: 0;
  --card-mode-inline-breathing-room: 10px;
  margin-left: calc(-1 * (var(--sys-spacing-med) + var(--pu-safe-left)));
  margin-right: calc(-1 * (var(--sys-spacing-med) + var(--pu-safe-right)));
}

.card-stage {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  flex: 1 1 auto;
  min-height: 0;
  --card-stage-top-inset: 2%;
  --card-stage-bottom-inset: 10%;
  --card-stage-label-gap: calc(var(--sys-spacing-sm) + 12px);
  --card-stage-page-width: min(100vw, var(--dcs-layout-page-max-width));
  --card-stage-card-width: calc(
    var(--card-stage-page-width) - (var(--sys-spacing-med) * 2) -
      (var(--card-mode-inline-breathing-room) * 2) - var(--pu-safe-left) - var(
        --pu-safe-right
      )
  );
  isolation: isolate;
  padding-inline-start: calc(
    var(--sys-spacing-med) + var(--pu-safe-left) +
      var(--card-mode-inline-breathing-room)
  );
  padding-inline-end: calc(
    var(--sys-spacing-med) + var(--pu-safe-right) +
      var(--card-mode-inline-breathing-room)
  );
}

.card-stage__projection-layer {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  inline-size: 100vw;
  transform: translateX(-50%);
  pointer-events: none;
  overflow: visible;
}

.card-stage__projection-layer--underlay {
  z-index: 1;
}

.card-stage__label-rail {
  position: relative;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
  column-gap: var(--sys-spacing-sm);
  padding-block-end: var(--card-stage-label-gap);
  pointer-events: none;
}

.card-stage__inner {
  position: relative;
  z-index: 2;
  min-height: 0;
}

.card-stage__front-shell {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--card-stage-top-inset);
  bottom: var(--card-stage-bottom-inset);
  z-index: 3;
  animation: card-front-promote 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.card-stage__front {
  z-index: 2;
}

.card-stack-preview {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--card-stage-top-inset);
  bottom: var(--card-stage-bottom-inset);
  pointer-events: none;
  animation: card-preview-reveal 220ms ease-out both;
}

.card-stage__projection-side {
  position: absolute;
  inline-size: 46vw;
  block-size: 46vh;
  min-inline-size: 18rem;
  max-inline-size: 28rem;
  min-block-size: 22rem;
  max-block-size: 34rem;
  will-change: transform, opacity;
}

.card-stage__projection-side--left {
  left: 0;
}

.card-stage__projection-side--right {
  right: 0;
}

.card-stage__projection-label {
  @include mx.pu-font(title-medium);
  position: relative;
  margin: 0;
  white-space: nowrap;
  letter-spacing: 0.08em;
  opacity: 0;
  pointer-events: none;
  will-change: opacity, transform;
}

.card-stage__projection-label--left {
  justify-self: start;
  color: var(--sys-color-error);
  text-shadow:
    0 0 18px rgb(from var(--sys-color-error) r g b / 0.42),
    0 0 38px rgb(from var(--sys-color-error) r g b / 0.2);
}

.card-stage__projection-label--right {
  justify-self: end;
  color: var(--sys-color-primary);
  text-align: end;
  text-shadow:
    0 0 18px rgb(from var(--sys-color-primary) r g b / 0.42),
    0 0 38px rgb(from var(--sys-color-primary) r g b / 0.2);
}

.card-stage__projection-light {
  position: absolute;
  inset: 16% 0 0;
  opacity: 0;
  mix-blend-mode: screen;
  will-change: opacity, transform;
}

.card-stage__projection-source,
.card-stage__projection-bloom,
.card-stage__projection-rim,
.card-stage__projection-spill {
  position: absolute;
  border-radius: 999px;
}

.card-stage__projection-source {
  inset: 18% 12% 18% 12%;
  opacity: var(--card-stage-projection-source-opacity, 0);
  filter: blur(34px);
}

.card-stage__projection-bloom {
  inset: -4%;
  opacity: var(--card-stage-projection-bloom-opacity, 0);
  filter: blur(108px);
}

.card-stage__projection-rim {
  top: 24%;
  bottom: 18%;
  inline-size: 48%;
  opacity: var(--card-stage-projection-rim-opacity, 0);
  filter: blur(48px);
}

.card-stage__projection-spill {
  top: 12%;
  bottom: 10%;
  inline-size: 124%;
  opacity: var(--card-stage-projection-spill-opacity, 0);
  filter: blur(84px);
}

.card-stage__projection-side--left .card-stage__projection-source {
  background: radial-gradient(
    ellipse at 14% 50%,
    var(--sys-color-error) 0%,
    transparent 72%
  );
}

.card-stage__projection-side--left .card-stage__projection-bloom {
  background: radial-gradient(
    ellipse at 10% 50%,
    var(--sys-color-error) 0%,
    transparent 84%
  );
}

.card-stage__projection-side--left .card-stage__projection-rim {
  inset-inline-start: 4%;
  background: linear-gradient(
    90deg,
    var(--sys-color-error) 0%,
    transparent 100%
  );
}

.card-stage__projection-side--left .card-stage__projection-spill {
  inset-inline-start: -40%;
  background: linear-gradient(
    90deg,
    var(--sys-color-error) 0%,
    transparent 100%
  );
}

.card-stage__projection-side--right .card-stage__projection-source {
  background: radial-gradient(
    ellipse at 86% 50%,
    var(--sys-color-primary) 0%,
    transparent 72%
  );
}

.card-stage__projection-side--right .card-stage__projection-bloom {
  background: radial-gradient(
    ellipse at 90% 50%,
    var(--sys-color-primary) 0%,
    transparent 84%
  );
}

.card-stage__projection-side--right .card-stage__projection-rim {
  inset-inline-end: 4%;
  background: linear-gradient(
    270deg,
    var(--sys-color-primary) 0%,
    transparent 100%
  );
}

.card-stage__projection-side--right .card-stage__projection-spill {
  inset-inline-end: -40%;
  background: linear-gradient(
    270deg,
    var(--sys-color-primary) 0%,
    transparent 100%
  );
}

@keyframes card-front-promote {
  from {
    transform: translateY(14px) scale(0.972);
  }
  to {
    transform: translateY(0) scale(1);
  }
}

@keyframes card-preview-reveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.card-mode__error {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-error);
  padding-inline-start: calc(
    var(--sys-spacing-med) + var(--pu-safe-left) +
      var(--card-mode-inline-breathing-room)
  );
  padding-inline-end: calc(
    var(--sys-spacing-med) + var(--pu-safe-right) +
      var(--card-mode-inline-breathing-room)
  );
}

.card-mode__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-sm);
  padding-inline-start: calc(
    var(--sys-spacing-med) + var(--pu-safe-left) +
      var(--card-mode-inline-breathing-room)
  );
  padding-inline-end: calc(
    var(--sys-spacing-med) + var(--pu-safe-right) +
      var(--card-mode-inline-breathing-room)
  );
  padding-bottom: var(--sys-spacing-sm);
}

.card-mode__action {
  min-height: 48px;
}

.card-empty-stack {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  padding-bottom: var(--sys-spacing-med);
}

.card-empty {
  padding: var(--sys-spacing-med);
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.card-empty__title {
  @include mx.pu-font(title-medium);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.card-empty__subtitle {
  @include mx.pu-font(body-small);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.card-empty__create {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.card-empty__field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.card-empty__label {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.card-empty__input {
  @include mx.pu-field-shell(compact-surface);
  min-height: var(--sys-size-large);
}

.card-empty__error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

</style>
