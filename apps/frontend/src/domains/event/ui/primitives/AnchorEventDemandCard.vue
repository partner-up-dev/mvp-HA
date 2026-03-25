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
    <div v-if="!preview" class="demand-card__stamps" aria-hidden="true">
      <span
        class="demand-card__stamp demand-card__stamp--like"
        :style="{ opacity: likeStampOpacity }"
      >
        {{ t("anchorEvent.card.stampLike") }}
      </span>
      <span
        class="demand-card__stamp demand-card__stamp--nope"
        :style="{ opacity: nopeStampOpacity }"
      >
        {{ t("anchorEvent.card.stampNope") }}
      </span>
    </div>

    <div
      v-if="coverImage"
      class="demand-card__cover"
      :style="{ backgroundImage: `url(${coverImage})` }"
    >
      <span class="demand-card__time-badge">{{ timeLabel }}</span>
    </div>
    <div v-else class="demand-card__cover demand-card__cover--fallback">
      <span class="demand-card__time-badge">{{ timeLabel }}</span>
    </div>

    <div class="demand-card__content">
      <section class="demand-card__primary">
        <h2 class="demand-card__location">{{ displayLocationName }}</h2>
        <p class="demand-card__time">{{ timeLabel }}</p>
      </section>

      <section class="demand-card__preferences" aria-live="polite">
        <p class="demand-card__preferences-title">
          {{ t("anchorEvent.card.preferenceTitle") }}
        </p>
        <div v-if="preferenceTags.length > 0" class="demand-card__preference-list">
          <span
            v-for="tag in preferenceTags"
            :key="tag"
            class="demand-card__preference-chip"
          >
            {{ tag }}
          </span>
        </div>
        <p v-else class="demand-card__preference-empty">
          {{ t("anchorEvent.card.preferenceEmpty") }}
        </p>
      </section>

      <div v-if="!preview" class="demand-card__actions">
        <button
          type="button"
          class="demand-card__action demand-card__action--skip"
          :disabled="isInteractionLocked"
          @pointerdown.stop
          @click="emit('skip')"
        >
          {{ t("anchorEvent.card.skipButton") }}
        </button>
        <button
          type="button"
          class="demand-card__action demand-card__action--detail"
          :disabled="isInteractionLocked || detailPrId === null"
          @pointerdown.stop
          @click="emit('view-detail')"
        >
          {{ t("anchorEvent.card.detailButton") }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const MAX_DRAG_DISTANCE = 260;
const MIN_DISTANCE_THRESHOLD = 96;
const DISTANCE_THRESHOLD_RATIO = 0.34;
const FLICK_VELOCITY_THRESHOLD = 900;
const ROTATION_DIVISOR = 22;
const MAX_ROTATION_DEG = 18;
const EXIT_TRANSITION = "transform 280ms cubic-bezier(0.16, 1, 0.3, 1)";
const REBOUND_TRANSITION = "transform 440ms cubic-bezier(0.22, 1.35, 0.36, 1)";
const MILLISECONDS_PER_SECOND = 1000;
const EXIT_VIEWPORT_MULTIPLIER = 1.1;
const EXIT_DRAG_MULTIPLIER = 1.5;

type PointerState = {
  pointerId: number;
  startX: number;
  lastX: number;
  lastTimestamp: number;
  tiltDirectionFactor: number;
  pivotY: number;
};

type SwipeAction = "skip" | "view-detail";
type SwipePhase = "idle" | "dragging" | "exiting" | "rebounding";

const props = withDefaults(
  defineProps<{
    displayLocationName: string;
    timeLabel: string;
    preferenceTags: string[];
    coverImage?: string | null;
    detailPrId?: number | null;
    pending?: boolean;
    preview?: boolean;
  }>(),
  {
    coverImage: null,
    detailPrId: null,
    pending: false,
    preview: false,
  },
);

const emit = defineEmits<{
  skip: [];
  "view-detail": [];
}>();

const { t } = useI18n();

const activePointer = ref<PointerState | null>(null);
const translateX = ref(0);
const rawTranslateX = ref(0);
const swipeThreshold = ref(MIN_DISTANCE_THRESHOLD);
const settleTransition = ref(REBOUND_TRANSITION);
const swipePhase = ref<SwipePhase>("idle");
const pendingAction = ref<SwipeAction | null>(null);
const hasDispatchedExitAction = ref(false);

const isDragging = computed(() => swipePhase.value === "dragging");
const isPendingState = computed(
  () => (!props.preview && props.pending) || swipePhase.value === "exiting",
);
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
const likeStampOpacity = computed(() =>
  rawTranslateX.value > 0 ? dragProgress.value : 0,
);
const nopeStampOpacity = computed(() =>
  rawTranslateX.value < 0 ? dragProgress.value : 0,
);
const rotationDeg = computed(() => {
  const tiltDirectionFactor = activePointer.value?.tiltDirectionFactor ?? 1;
  const rotation = (translateX.value / ROTATION_DIVISOR) * tiltDirectionFactor;
  return Math.max(Math.min(rotation, MAX_ROTATION_DEG), -MAX_ROTATION_DEG);
});
const transformOrigin = computed(() => {
  const pivotY = activePointer.value?.pivotY;
  if (typeof pivotY !== "number") {
    return "50% 50%";
  }
  return `50% ${pivotY}px`;
});

const cardStyle = computed(() => {
  const scale = 1 - dragProgress.value * 0.02;
  return {
    transformOrigin: transformOrigin.value,
    transform: `translateX(${translateX.value}px) rotate(${rotationDeg.value}deg) scale(${scale})`,
    transition: swipePhase.value === "dragging" ? "none" : settleTransition.value,
  };
});

const applyDamping = (offsetX: number): number => {
  const sign = offsetX >= 0 ? 1 : -1;
  const abs = Math.abs(offsetX);
  const damped = MAX_DRAG_DISTANCE * Math.tanh((abs / MAX_DRAG_DISTANCE) * 1.2);
  return sign * damped;
};

const resetCardState = () => {
  activePointer.value = null;
  translateX.value = 0;
  rawTranslateX.value = 0;
  settleTransition.value = REBOUND_TRANSITION;
  swipePhase.value = "idle";
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
};

const startRebound = () => {
  activePointer.value = null;
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "rebounding";
  settleTransition.value = REBOUND_TRANSITION;
  translateX.value = 0;
  rawTranslateX.value = 0;
};

const startExit = (action: SwipeAction) => {
  const direction = action === "skip" ? -1 : 1;

  activePointer.value = null;
  pendingAction.value = action;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "exiting";
  settleTransition.value = EXIT_TRANSITION;
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
  const tiltDirectionFactor = 1 - normalizedY * 2;
  swipeThreshold.value = Math.max(
    MIN_DISTANCE_THRESHOLD,
    window.innerWidth * DISTANCE_THRESHOLD_RATIO,
  );
  settleTransition.value = REBOUND_TRANSITION;
  pendingAction.value = null;
  hasDispatchedExitAction.value = false;
  swipePhase.value = "dragging";

  currentTarget.setPointerCapture(event.pointerId);
  activePointer.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    lastX: event.clientX,
    lastTimestamp: event.timeStamp,
    tiltDirectionFactor,
    pivotY: localY,
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
  pointer.lastX = event.clientX;
  pointer.lastTimestamp = event.timeStamp;
};

const resolveSwipeAction = (
  offsetX: number,
  velocityX: number,
): SwipeAction | null => {
  if (
    offsetX <= -swipeThreshold.value ||
    velocityX <= -FLICK_VELOCITY_THRESHOLD
  ) {
    return "skip";
  }

  if (
    offsetX >= swipeThreshold.value ||
    velocityX >= FLICK_VELOCITY_THRESHOLD
  ) {
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

  const timeDelta = Math.max(event.timeStamp - pointer.lastTimestamp, 1);
  const velocityX =
    ((event.clientX - pointer.lastX) / timeDelta) * MILLISECONDS_PER_SECOND;
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
  () => [props.displayLocationName, props.timeLabel, props.detailPrId],
  () => {
    if (swipePhase.value !== "idle") {
      resetCardState();
    }
  },
);

watch(() => props.pending, (isPending) => {
  if (isPending && activePointer.value !== null) {
    startRebound();
  }
});
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

.demand-card__stamps {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.demand-card__stamp {
  position: absolute;
  top: var(--sys-spacing-med);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
  border-radius: var(--sys-radius-med);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  @include mx.pu-font(title-medium);
  font-weight: 700;
  letter-spacing: 0.06em;
  background: var(--sys-color-surface);
}

.demand-card__stamp--like {
  left: var(--sys-spacing-med);
  color: var(--sys-color-green);
  transform: rotate(-14deg);
}

.demand-card__stamp--nope {
  right: var(--sys-spacing-med);
  color: var(--sys-color-red);
  transform: rotate(14deg);
}

.demand-card__cover {
  min-height: var(--dcs-layout-anchor-card-cover-height);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: var(--sys-spacing-sm);
}

.demand-card__cover--fallback {
  background:
    linear-gradient(
      135deg,
      var(--sys-color-surface-container-high),
      var(--sys-color-surface-container)
    );
}

.demand-card__time-badge {
  @include mx.pu-font(label-large);
  display: inline-flex;
  align-items: center;
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: 999px;
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.demand-card__content {
  padding: var(--dcs-space-anchor-card-content-padding);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  flex: 1;
  justify-content: space-between;
}

.demand-card__primary {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.demand-card__location {
  @include mx.pu-font(headline-medium);
  margin: 0;
  color: var(--sys-color-on-surface);
  line-height: 1.1;
}

.demand-card__time {
  @include mx.pu-font(title-large);
  margin: 0;
  color: var(--sys-color-primary);
}

.demand-card__preferences {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.demand-card__preferences-title {
  @include mx.pu-font(label-large);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
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

.demand-card__preference-empty {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.demand-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-sm);
}

.demand-card__action {
  @include mx.pu-pill-action(outline-transparent, default);
  border: none;
  cursor: pointer;
  min-height: 48px;
}

.demand-card__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.demand-card__action--detail {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  border-color: var(--sys-color-primary);
}

.demand-card__action--skip {
  color: var(--sys-color-error);
  border-color: var(--sys-color-error);
}
</style>
