<template>
  <article
    class="demand-card"
    :class="{
      'demand-card--dragging': isDragging,
      'demand-card--pending': isPendingState,
      'demand-card--preview': preview,
    }"
    :style="cardStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @transitionend="handleTransitionEnd"
  >
    <div
      v-if="coverImage"
      class="demand-card__cover"
      :style="{ backgroundImage: `url(${coverImage})` }"
    >
      <span class="demand-card__location-badge">{{ displayLocationName }}</span>
    </div>
    <div v-else class="demand-card__cover demand-card__cover--fallback">
      <span class="demand-card__fallback-location">{{
        displayLocationName
      }}</span>
    </div>

    <div class="demand-card__content">
      <section class="demand-card__primary">
        <p class="demand-card__time">{{ timeLabel }}</p>
        <div
          v-if="preferenceTags.length > 0"
          class="demand-card__preference-list"
        >
          <span
            v-for="tag in preferenceTags"
            :key="tag"
            class="demand-card__preference-chip"
          >
            {{ tag }}
          </span>
        </div>
        <p v-if="displayNotes" class="demand-card__notes">
          {{ displayNotes }}
        </p>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  DEMAND_CARD_EXIT_TRANSITION,
  DEMAND_CARD_REBOUND_TRANSITION,
  createDemandCardSwipePreviewState,
  type DemandCardSwipePreviewAnchorCorner,
  type DemandCardSwipePreviewPhase,
  type DemandCardSwipePreviewState,
} from "@/domains/event/ui/demand-card-swipe-feedback";

const MAX_DRAG_DISTANCE = 260;
const MIN_DISTANCE_THRESHOLD = 96;
const DISTANCE_THRESHOLD_RATIO = 0.34;
const FLICK_VELOCITY_THRESHOLD = 760;
const FLICK_MIN_DISTANCE = 22;
const ROTATION_DIVISOR = 22;
const MAX_ROTATION_DEG = 18;
const MILLISECONDS_PER_SECOND = 1000;
const VELOCITY_SAMPLE_WINDOW_MS = 90;
const MAX_VELOCITY_SAMPLES = 8;
const PREVIEW_BASE_OFFSET_Y = 14;
const PREVIEW_OFFSET_STEP_Y = 12;
const PREVIEW_BASE_SCALE = 0.972;
const PREVIEW_SCALE_STEP = 0.028;
const PREVIEW_MIN_SCALE = 0.88;
const PREVIEW_OPACITY_STEP = 0.12;
const PREVIEW_MIN_OPACITY = 0.72;
const EXIT_VIEWPORT_MULTIPLIER = 1.1;
const EXIT_DRAG_MULTIPLIER = 1.5;

type MotionSample = {
  x: number;
  timestamp: number;
};

type PointerState = {
  pointerId: number;
  startX: number;
  tiltDirectionFactor: number;
  pivotY: number;
  motionSamples: MotionSample[];
};

type SwipeAction = "skip" | "view-detail";
type SwipePhase = DemandCardSwipePreviewPhase;

const props = withDefaults(
  defineProps<{
    displayLocationName: string;
    timeLabel: string;
    preferenceTags: string[];
    notes?: string | null;
    coverImage?: string | null;
    detailPrId?: number | null;
    pending?: boolean;
    preview?: boolean;
    previewDepth?: number;
  }>(),
  {
    notes: null,
    coverImage: null,
    detailPrId: null,
    pending: false,
    preview: false,
    previewDepth: 1,
  },
);

const emit = defineEmits<{
  skip: [];
  "view-detail": [];
  "swipe-preview": [previewState: DemandCardSwipePreviewState];
}>();

const activePointer = ref<PointerState | null>(null);
const translateX = ref(0);
const rawTranslateX = ref(0);
const swipeThreshold = ref(MIN_DISTANCE_THRESHOLD);
const settleTransition = ref(DEMAND_CARD_REBOUND_TRANSITION);
const swipePhase = ref<SwipePhase>("idle");
const pendingAction = ref<SwipeAction | null>(null);
const hasDispatchedExitAction = ref(false);
const previewAnchorViewportY = ref<number | null>(null);
const previewAnchorCorner = ref<DemandCardSwipePreviewAnchorCorner | null>(null);

const isDragging = computed(() => swipePhase.value === "dragging");
const isPendingState = computed(
  () => (!props.preview && props.pending) || swipePhase.value === "exiting",
);
const displayNotes = computed(() => {
  const normalized = props.notes?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
});
const isInteractionLocked = computed(
  () =>
    props.preview ||
    props.pending ||
    swipePhase.value === "exiting" ||
    swipePhase.value === "rebounding",
);
const dragProgress = computed(() =>
  Math.min(Math.abs(rawTranslateX.value) / swipeThreshold.value, 1),
);
const rotationDeg = computed(() => {
  const tiltDirectionFactor = activePointer.value?.tiltDirectionFactor ?? 1;
  const rotation = (translateX.value / ROTATION_DIVISOR) * tiltDirectionFactor;
  return Math.max(Math.min(rotation, MAX_ROTATION_DEG), -MAX_ROTATION_DEG);
});
const transformOrigin = computed(() => {
  if (props.preview) {
    return "center top";
  }

  const pivotY = activePointer.value?.pivotY;
  if (typeof pivotY !== "number") {
    return "50% 50%";
  }
  return `50% ${pivotY}px`;
});

const cardStyle = computed(() => {
  if (props.preview) {
    const depth = Math.max(props.previewDepth, 1);
    const offsetY = PREVIEW_BASE_OFFSET_Y + (depth - 1) * PREVIEW_OFFSET_STEP_Y;
    const previewScale = Math.max(
      PREVIEW_BASE_SCALE - (depth - 1) * PREVIEW_SCALE_STEP,
      PREVIEW_MIN_SCALE,
    );
    const previewOpacity = Math.max(
      1 - (depth - 1) * PREVIEW_OPACITY_STEP,
      PREVIEW_MIN_OPACITY,
    );

    return {
      transformOrigin: transformOrigin.value,
      transform: `translateY(${offsetY}px) scale(${previewScale})`,
      transition: "none",
      opacity: previewOpacity,
    };
  }

  const scale = 1 - dragProgress.value * 0.02;
  return {
    transformOrigin: transformOrigin.value,
    transform: `translateX(${translateX.value}px) rotate(${rotationDeg.value}deg) scale(${scale})`,
    transition:
      swipePhase.value === "dragging" ? "none" : settleTransition.value,
  };
});

const applyDamping = (offsetX: number): number => {
  const sign = offsetX >= 0 ? 1 : -1;
  const abs = Math.abs(offsetX);
  const damped = MAX_DRAG_DISTANCE * Math.tanh((abs / MAX_DRAG_DISTANCE) * 1.2);
  return sign * damped;
};

const appendMotionSample = (
  pointer: PointerState,
  x: number,
  timestamp: number,
) => {
  pointer.motionSamples.push({ x, timestamp });
  const sampleWindowStart = timestamp - VELOCITY_SAMPLE_WINDOW_MS * 2;
  pointer.motionSamples = pointer.motionSamples
    .filter((sample) => sample.timestamp >= sampleWindowStart)
    .slice(-MAX_VELOCITY_SAMPLES);
};

const resolveVelocityX = (
  pointer: PointerState,
  endX: number,
  endTimestamp: number,
): number => {
  const samples = [
    ...pointer.motionSamples,
    { x: endX, timestamp: endTimestamp },
  ].sort((left, right) => left.timestamp - right.timestamp);
  const windowStart = endTimestamp - VELOCITY_SAMPLE_WINDOW_MS;
  const earliestWindowSample =
    samples.find((sample) => sample.timestamp >= windowStart) ?? samples[0];

  const timeDelta = Math.max(endTimestamp - earliestWindowSample.timestamp, 1);
  return (
    ((endX - earliestWindowSample.x) / timeDelta) * MILLISECONDS_PER_SECOND
  );
};

const emitSwipePreview = (
  intensity: number,
  phase: SwipePhase = swipePhase.value,
  anchorViewportY: number | null = previewAnchorViewportY.value,
  anchorCorner: DemandCardSwipePreviewAnchorCorner | null =
    previewAnchorCorner.value,
) => {
  if (props.preview) {
    return;
  }

  emit(
    "swipe-preview",
    createDemandCardSwipePreviewState(
      intensity,
      phase,
      anchorViewportY,
      anchorCorner,
    ),
  );
};

const resetCardState = () => {
  previewAnchorViewportY.value = null;
  previewAnchorCorner.value = null;
  emitSwipePreview(0, "idle", null, null);
  activePointer.value = null;
  translateX.value = 0;
  rawTranslateX.value = 0;
  settleTransition.value = DEMAND_CARD_REBOUND_TRANSITION;
  swipePhase.value = "idle";
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
};

const startRebound = () => {
  activePointer.value = null;
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "rebounding";
  settleTransition.value = DEMAND_CARD_REBOUND_TRANSITION;
  emitSwipePreview(0, "rebounding");
  translateX.value = 0;
  rawTranslateX.value = 0;
};

const startExit = (action: SwipeAction) => {
  const direction = action === "skip" ? -1 : 1;

  activePointer.value = null;
  pendingAction.value = action;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "exiting";
  settleTransition.value = DEMAND_CARD_EXIT_TRANSITION;
  emitSwipePreview(direction, "exiting");
  rawTranslateX.value = direction * swipeThreshold.value;
  translateX.value =
    direction *
    Math.max(
      window.innerWidth * EXIT_VIEWPORT_MULTIPLIER,
      MAX_DRAG_DISTANCE * EXIT_DRAG_MULTIPLIER,
    );
};

const handlePointerDown = (event: PointerEvent) => {
  if (isInteractionLocked.value || swipePhase.value !== "idle") return;

  const currentTarget = event.currentTarget;
  if (!(currentTarget instanceof HTMLElement)) return;

  const rect = currentTarget.getBoundingClientRect();
  const localY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  const normalizedY =
    rect.height > 0 ? Math.min(Math.max(localY / rect.height, 0), 1) : 0.5;
  const anchorCorner: DemandCardSwipePreviewAnchorCorner =
    normalizedY <= 0.5 ? "top" : "bottom";
  const tiltDirectionFactor = 1 - normalizedY * 2;
  swipeThreshold.value = Math.max(
    MIN_DISTANCE_THRESHOLD,
    window.innerWidth * DISTANCE_THRESHOLD_RATIO,
  );
  settleTransition.value = DEMAND_CARD_REBOUND_TRANSITION;
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "dragging";
  previewAnchorViewportY.value = event.clientY;
  previewAnchorCorner.value = anchorCorner;
  emitSwipePreview(0, "dragging", event.clientY, anchorCorner);

  currentTarget.setPointerCapture(event.pointerId);
  activePointer.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    tiltDirectionFactor,
    pivotY: localY,
    motionSamples: [{ x: event.clientX, timestamp: event.timeStamp }],
  };
};

const handlePointerMove = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (
    !pointer ||
    pointer.pointerId !== event.pointerId ||
    swipePhase.value !== "dragging"
  ) {
    return;
  }

  rawTranslateX.value = event.clientX - pointer.startX;
  translateX.value = applyDamping(rawTranslateX.value);
  emitSwipePreview(rawTranslateX.value / swipeThreshold.value, "dragging");
  appendMotionSample(pointer, event.clientX, event.timeStamp);
};

const resolveSwipeAction = (
  offsetX: number,
  velocityX: number,
): SwipeAction | null => {
  const isFastSkipGesture =
    velocityX <= -FLICK_VELOCITY_THRESHOLD && offsetX <= -FLICK_MIN_DISTANCE;
  const isFastDetailGesture =
    velocityX >= FLICK_VELOCITY_THRESHOLD && offsetX >= FLICK_MIN_DISTANCE;

  if (offsetX <= -swipeThreshold.value || isFastSkipGesture) {
    return "skip";
  }

  if (offsetX >= swipeThreshold.value || isFastDetailGesture) {
    return "view-detail";
  }

  return null;
};

const handlePointerUp = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (
    !pointer ||
    pointer.pointerId !== event.pointerId ||
    swipePhase.value !== "dragging"
  ) {
    return;
  }

  const velocityX = resolveVelocityX(pointer, event.clientX, event.timeStamp);
  const action = resolveSwipeAction(rawTranslateX.value, velocityX);
  activePointer.value = null;

  if (action === "view-detail" && props.detailPrId === null) {
    startRebound();
    return;
  }

  if (action) {
    startExit(action);
    return;
  }

  startRebound();
};

const handlePointerCancel = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (!pointer || pointer.pointerId !== event.pointerId) return;
  startRebound();
};

const handleTransitionEnd = (event: TransitionEvent) => {
  if (props.preview) {
    return;
  }

  if (
    event.propertyName !== "transform" ||
    event.target !== event.currentTarget
  ) {
    return;
  }

  if (swipePhase.value === "rebounding") {
    resetCardState();
    return;
  }

  if (
    swipePhase.value !== "exiting" ||
    pendingAction.value === null ||
    hasDispatchedExitAction.value
  ) {
    return;
  }

  hasDispatchedExitAction.value = true;
  if (pendingAction.value === "skip") {
    emit("skip");
    return;
  }

  emit("view-detail");
};

watch(
  () => props.pending,
  (isPending, wasPending) => {
    if (
      isPending ||
      !wasPending ||
      swipePhase.value !== "exiting" ||
      pendingAction.value !== "view-detail" ||
      !hasDispatchedExitAction.value
    ) {
      return;
    }

    startRebound();
  },
);

watch(
  () => [
    props.displayLocationName,
    props.timeLabel,
    props.detailPrId,
    props.notes,
    props.preferenceTags.join("|"),
  ],
  () => {
    if (swipePhase.value !== "idle") {
      resetCardState();
    }
  },
);

watch(
  () => props.pending,
  (isPending) => {
    if (isPending && activePointer.value !== null) {
      startRebound();
    }
  },
);
</script>

<style lang="scss" scoped>
.demand-card {
  position: absolute;
  inset: 0;
  border-radius: var(--dcs-surface-panel-radius-large);
  overflow: hidden;
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  box-shadow: var(--sys-shadow-3);
  touch-action: pan-y;
  display: flex;
  flex-direction: column;
}

.demand-card--pending {
  opacity: 0.9;
}

.demand-card--preview {
  box-shadow: var(--sys-shadow-2);
}

.demand-card--preview .demand-card__cover {
  filter: saturate(0.85) brightness(0.9);
}

.demand-card--preview .demand-card__content {
  gap: var(--sys-spacing-sm);
}

.demand-card__cover {
  min-height: clamp(220px, calc(var(--pu-vh) * 0.34), 420px);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: var(--sys-spacing-sm);
}

.demand-card__cover--fallback {
  align-items: center;
  justify-content: center;
  background: var(--sys-color-primary-container);
  padding: var(--sys-spacing-med);
}

.demand-card__fallback-location {
  @include mx.pu-font(title-large);
  margin: 0;
  color: var(--sys-color-on-primary-container);
  text-align: center;
  overflow-wrap: anywhere;
}

.demand-card__location-badge {
  @include mx.pu-font(label-medium);
  display: inline-flex;
  align-items: center;
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: 999px;
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface);
  border: 1px solid var(--sys-color-outline-variant);
  backdrop-filter: blur(4px);
}

.demand-card__content {
  padding: var(--dcs-space-anchor-card-content-padding);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  flex: 1;
  min-height: 0;
}

.demand-card__primary {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.demand-card__time {
  @include mx.pu-font(title-medium);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.demand-card__preference-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
}

.demand-card__preference-chip {
  @include mx.pu-font(label-medium);
  display: inline-flex;
  align-items: center;
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: 999px;
  border: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface);
}

.demand-card__notes {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  white-space: pre-wrap;
}
</style>
