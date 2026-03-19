<template>
  <article
    class="demand-card"
    :class="{
      'demand-card--dragging': isDragging,
      'demand-card--pending': pending,
    }"
    :style="cardStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  >
    <div class="demand-card__stamps" aria-hidden="true">
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

      <div class="demand-card__actions">
        <button
          type="button"
          class="demand-card__action demand-card__action--skip"
          :disabled="pending"
          @pointerdown.stop
          @click="emit('skip')"
        >
          {{ t("anchorEvent.card.skipButton") }}
        </button>
        <button
          type="button"
          class="demand-card__action demand-card__action--detail"
          :disabled="pending || detailPrId === null"
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
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const SWIPE_THRESHOLD = 96;
const MAX_DRAG_DISTANCE = 260;

type PointerState = {
  pointerId: number;
  startX: number;
};

const props = withDefaults(
  defineProps<{
    displayLocationName: string;
    timeLabel: string;
    preferenceTags: string[];
    coverImage?: string | null;
    detailPrId?: number | null;
    pending?: boolean;
  }>(),
  {
    coverImage: null,
    detailPrId: null,
    pending: false,
  },
);

const emit = defineEmits<{
  skip: [];
  "view-detail": [];
}>();

const { t } = useI18n();

const activePointer = ref<PointerState | null>(null);
const translateX = ref(0);

const isDragging = computed(() => activePointer.value !== null);
const dragProgress = computed(() =>
  Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1),
);
const likeStampOpacity = computed(() =>
  translateX.value > 0 ? dragProgress.value : 0,
);
const nopeStampOpacity = computed(() =>
  translateX.value < 0 ? dragProgress.value : 0,
);

const cardStyle = computed(() => {
  const rotate = translateX.value / 24;
  const scale = 1 - dragProgress.value * 0.02;
  return {
    transform: `translateX(${translateX.value}px) rotate(${rotate}deg) scale(${scale})`,
    transition: isDragging.value
      ? "none"
      : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
  };
});

const applyDamping = (offsetX: number): number => {
  const sign = offsetX >= 0 ? 1 : -1;
  const abs = Math.abs(offsetX);
  const damped = MAX_DRAG_DISTANCE * Math.tanh((abs / MAX_DRAG_DISTANCE) * 1.2);
  return sign * damped;
};

const resetDrag = () => {
  activePointer.value = null;
  translateX.value = 0;
};

const handlePointerDown = (event: PointerEvent) => {
  if (props.pending) return;

  const currentTarget = event.currentTarget;
  if (!(currentTarget instanceof HTMLElement)) return;

  currentTarget.setPointerCapture(event.pointerId);
  activePointer.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
  };
};

const handlePointerMove = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (!pointer || pointer.pointerId !== event.pointerId) return;

  const offset = event.clientX - pointer.startX;
  translateX.value = applyDamping(offset);
};

const resolveSwipeAction = (
  offsetX: number,
): "skip" | "view-detail" | null => {
  if (offsetX <= -SWIPE_THRESHOLD) {
    return "skip";
  }

  if (offsetX >= SWIPE_THRESHOLD) {
    return "view-detail";
  }

  return null;
};

const handlePointerUp = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (!pointer || pointer.pointerId !== event.pointerId) return;

  const action = resolveSwipeAction(translateX.value);
  resetDrag();

  if (action === "skip") {
    emit("skip");
    return;
  }

  if (action === "view-detail" && props.detailPrId !== null) {
    emit("view-detail");
  }
};

const handlePointerCancel = (event: PointerEvent) => {
  const pointer = activePointer.value;
  if (!pointer || pointer.pointerId !== event.pointerId) return;
  resetDrag();
};
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
