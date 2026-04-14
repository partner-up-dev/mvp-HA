<template>
  <div
    ref="carouselRef"
    class="anchor-event-radio-card-carousel"
    :class="{
      'anchor-event-radio-card-carousel--disabled': props.disabled,
      'anchor-event-radio-card-carousel--dragging': isSwipeDragging,
    }"
    role="radiogroup"
    aria-orientation="horizontal"
    :aria-label="props.ariaLabel"
    :aria-disabled="props.disabled ? 'true' : undefined"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
  >
    <div class="anchor-event-radio-card-carousel__viewport">
      <div class="anchor-event-radio-card-carousel__stage">
        <div
          v-for="(eventItem, index) in props.events"
          :key="eventItem.id"
          :ref="(element) => setOptionRef(eventItem.id, element)"
          class="anchor-event-radio-card-carousel__option"
          :class="{
            'anchor-event-radio-card-carousel__option--selected':
              index === selectedIndex,
            'anchor-event-radio-card-carousel__option--peek':
              Math.abs(index - visualActiveIndex) <= 1,
            'anchor-event-radio-card-carousel__option--offstage':
              Math.abs(index - visualActiveIndex) > 1,
          }"
          role="radio"
          :aria-checked="index === selectedIndex"
          :aria-disabled="props.disabled ? 'true' : undefined"
          :aria-posinset="index + 1"
          :aria-setsize="props.events.length"
          :tabindex="optionTabIndex(index)"
          :style="optionStyle(index)"
          @click="handleOptionClick(index)"
          @keydown="handleOptionKeydown($event, index)"
        >
          <EventCard
            mode="select"
            :event="eventItem"
            :selected="index === selectedIndex"
            :disabled="props.disabled"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  type ComponentPublicInstance,
  type CSSProperties,
} from "vue";
import type { AnchorEventListItem } from "@/domains/event/model/types";
import EventCard from "@/domains/event/ui/primitives/EventCard.vue";

const SWIPE_LOCK_THRESHOLD_PX = 10;
const SWIPE_COMMIT_THRESHOLD_PX = 56;
const SWIPE_AXIS_DOMINANCE_RATIO = 1.15;
const MAX_DRAG_OFFSET_PX = 84;
const MAX_VISIBLE_DISTANCE = 3;

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    events: readonly AnchorEventListItem[];
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    disabled: false,
    ariaLabel: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [eventId: number | null];
}>();

const carouselRef = ref<HTMLDivElement | null>(null);
const optionElements = new Map<number, HTMLDivElement>();

const selectedIndex = computed(() =>
  props.events.findIndex((eventItem) => eventItem.id === props.modelValue),
);
const visualActiveIndex = computed(() => {
  if (props.events.length === 0) {
    return -1;
  }

  return selectedIndex.value >= 0 ? selectedIndex.value : 0;
});
const focusableIndex = computed(() => visualActiveIndex.value);
const canInteract = computed(() => !props.disabled && props.events.length > 0);
const canSwipe = computed(() => !props.disabled && props.events.length > 1);

const gesturePointerId = ref<number | null>(null);
const gestureStartX = ref(0);
const gestureStartY = ref(0);
const gestureDeltaX = ref(0);
const gestureDeltaY = ref(0);
const gestureAxis = ref<"x" | "y" | null>(null);
const dragOffsetPx = ref(0);
const suppressClickUntilMs = ref(0);

const isSwipeDragging = computed(
  () => gesturePointerId.value !== null && gestureAxis.value === "x",
);

const setOptionRef = (
  eventId: number,
  element: Element | ComponentPublicInstance | null,
) => {
  if (element instanceof HTMLDivElement) {
    optionElements.set(eventId, element);
    return;
  }

  optionElements.delete(eventId);
};

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const shouldSuppressClick = (): boolean => now() < suppressClickUntilMs.value;

const boundNumber = (value: number, minValue: number, maxValue: number): number =>
  Math.min(Math.max(value, minValue), maxValue);

const boundIndex = (index: number): number =>
  boundNumber(index, 0, props.events.length - 1);

const optionTabIndex = (index: number): number => {
  if (props.disabled || props.events.length === 0) {
    return -1;
  }

  return index === focusableIndex.value ? 0 : -1;
};

const focusOption = async (index: number) => {
  const eventItem = props.events[index];
  if (!eventItem) {
    return;
  }

  await nextTick();
  optionElements.get(eventItem.id)?.focus();
};

const selectIndex = (
  index: number,
  options: { focusAfterSelect?: boolean } = {},
) => {
  if (!canInteract.value) {
    return;
  }

  const nextEvent = props.events[index];
  if (!nextEvent) {
    return;
  }

  if (nextEvent.id !== props.modelValue) {
    emit("update:modelValue", nextEvent.id);
  }

  if (options.focusAfterSelect) {
    void focusOption(index);
  }
};

const moveSelection = (
  delta: -1 | 1,
  options: { focusAfterSelect?: boolean } = {},
) => {
  if (!canSwipe.value || visualActiveIndex.value < 0) {
    return;
  }

  const targetIndex = boundIndex(visualActiveIndex.value + delta);
  if (targetIndex === visualActiveIndex.value) {
    if (options.focusAfterSelect) {
      void focusOption(targetIndex);
    }
    return;
  }

  selectIndex(targetIndex, options);
};

const handleOptionClick = (index: number) => {
  if (shouldSuppressClick()) {
    return;
  }

  selectIndex(index, { focusAfterSelect: true });
};

const handleOptionKeydown = (event: KeyboardEvent, index: number) => {
  if (props.disabled) {
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
    case "ArrowUp":
      event.preventDefault();
      moveSelection(-1, { focusAfterSelect: true });
      break;
    case "ArrowRight":
    case "ArrowDown":
      event.preventDefault();
      moveSelection(1, { focusAfterSelect: true });
      break;
    case "Home":
      event.preventDefault();
      selectIndex(0, { focusAfterSelect: true });
      break;
    case "End":
      event.preventDefault();
      selectIndex(props.events.length - 1, { focusAfterSelect: true });
      break;
    case " ":
    case "Enter":
      event.preventDefault();
      selectIndex(index, { focusAfterSelect: true });
      break;
    default:
      break;
  }
};

const isGesturePointer = (event: PointerEvent): boolean =>
  event.pointerType === "touch" || event.pointerType === "pen";

const releasePointerCapture = (pointerId: number) => {
  const carousel = carouselRef.value;
  if (!carousel) {
    return;
  }

  try {
    if (carousel.hasPointerCapture(pointerId)) {
      carousel.releasePointerCapture(pointerId);
    }
  } catch {
    // Pointer capture can already be released when the interaction ends abruptly.
  }
};

const resetGestureState = () => {
  gesturePointerId.value = null;
  gestureStartX.value = 0;
  gestureStartY.value = 0;
  gestureDeltaX.value = 0;
  gestureDeltaY.value = 0;
  gestureAxis.value = null;
  dragOffsetPx.value = 0;
};

const handlePointerDown = (event: PointerEvent) => {
  if (!canSwipe.value || !isGesturePointer(event) || event.isPrimary === false) {
    return;
  }

  gesturePointerId.value = event.pointerId;
  gestureStartX.value = event.clientX;
  gestureStartY.value = event.clientY;
  gestureDeltaX.value = 0;
  gestureDeltaY.value = 0;
  gestureAxis.value = null;
  dragOffsetPx.value = 0;

  try {
    carouselRef.value?.setPointerCapture(event.pointerId);
  } catch {
    // Some browsers may reject pointer capture for certain touch transitions.
  }
};

const handlePointerMove = (event: PointerEvent) => {
  if (event.pointerId !== gesturePointerId.value) {
    return;
  }

  gestureDeltaX.value = event.clientX - gestureStartX.value;
  gestureDeltaY.value = event.clientY - gestureStartY.value;

  if (gestureAxis.value === null) {
    const absX = Math.abs(gestureDeltaX.value);
    const absY = Math.abs(gestureDeltaY.value);

    if (absX < SWIPE_LOCK_THRESHOLD_PX && absY < SWIPE_LOCK_THRESHOLD_PX) {
      return;
    }

    if (absX > absY * SWIPE_AXIS_DOMINANCE_RATIO) {
      gestureAxis.value = "x";
      suppressClickUntilMs.value = now() + 320;
    } else {
      releasePointerCapture(event.pointerId);
      resetGestureState();
      return;
    }
  }

  if (gestureAxis.value !== "x") {
    return;
  }

  if (event.cancelable) {
    event.preventDefault();
  }

  dragOffsetPx.value = boundNumber(
    gestureDeltaX.value,
    -MAX_DRAG_OFFSET_PX,
    MAX_DRAG_OFFSET_PX,
  );
};

const finalizePointerInteraction = (
  pointerId: number,
  options: { commitSelection: boolean },
) => {
  const activeIndex = visualActiveIndex.value;
  const deltaX = dragOffsetPx.value;

  releasePointerCapture(pointerId);
  resetGestureState();

  if (!options.commitSelection || activeIndex < 0) {
    return;
  }

  const targetIndex = boundIndex(activeIndex + (deltaX < 0 ? 1 : -1));
  if (targetIndex === activeIndex) {
    return;
  }

  selectIndex(targetIndex);
};

const handlePointerUp = (event: PointerEvent) => {
  if (event.pointerId !== gesturePointerId.value) {
    return;
  }

  const shouldCommit =
    gestureAxis.value === "x" &&
    Math.abs(gestureDeltaX.value) >= SWIPE_COMMIT_THRESHOLD_PX &&
    Math.abs(gestureDeltaX.value) >
      Math.abs(gestureDeltaY.value) * SWIPE_AXIS_DOMINANCE_RATIO;

  finalizePointerInteraction(event.pointerId, {
    commitSelection: shouldCommit,
  });
};

const handlePointerCancel = (event: PointerEvent) => {
  if (event.pointerId !== gesturePointerId.value) {
    return;
  }

  finalizePointerInteraction(event.pointerId, {
    commitSelection: false,
  });
};

const optionStyle = (index: number): CSSProperties => {
  if (visualActiveIndex.value < 0) {
    return {};
  }

  const offset = index - visualActiveIndex.value;
  const absOffset = Math.abs(offset);
  const limitedAbsOffset = Math.min(absOffset, MAX_VISIBLE_DISTANCE);
  const direction = offset === 0 ? 0 : offset > 0 ? 1 : -1;
  const translatePercent =
    direction === 0
      ? 0
      : direction * (72 + Math.max(0, limitedAbsOffset - 1) * 18);
  const dragInfluence = Math.max(0.38, 1 - absOffset * 0.18);
  const translatePx = dragOffsetPx.value * dragInfluence;
  const scale =
    absOffset === 0 ? 1 : absOffset === 1 ? 0.92 : absOffset === 2 ? 0.84 : 0.78;
  const opacity =
    absOffset === 0 ? 1 : absOffset === 1 ? 0.74 : absOffset === 2 ? 0.38 : 0;

  return {
    transform: `translateX(calc(${translatePercent}% + ${translatePx}px)) scale(${scale})`,
    opacity,
    zIndex: String(Math.max(1, 40 - limitedAbsOffset)),
    pointerEvents: props.disabled ? "none" : absOffset <= 1 ? "auto" : "none",
  };
};
</script>

<style lang="scss" scoped>
.anchor-event-radio-card-carousel {
  --anchor-event-carousel-card-width: min(
    calc(100% - (2 * var(--sys-spacing-med))),
    21rem
  );

  width: 100%;
  min-width: 0;
}

.anchor-event-radio-card-carousel__viewport {
  overflow: hidden;
  padding:
    var(--sys-spacing-xs)
    var(--sys-spacing-med)
    var(--sys-spacing-sm);
  touch-action: pan-y;
}

.anchor-event-radio-card-carousel--dragging
  .anchor-event-radio-card-carousel__viewport {
  user-select: none;
}

.anchor-event-radio-card-carousel__stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
}

.anchor-event-radio-card-carousel__option {
  grid-area: 1 / 1;
  inline-size: var(--anchor-event-carousel-card-width);
  max-width: 100%;
  justify-self: center;
  border-radius: var(--sys-radius-lg);
  cursor: pointer;
  outline: none;
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
  will-change: transform, opacity;
}

.anchor-event-radio-card-carousel__option:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 4px;
}

.anchor-event-radio-card-carousel__option--offstage {
  pointer-events: none;
}

.anchor-event-radio-card-carousel--disabled
  .anchor-event-radio-card-carousel__option {
  cursor: not-allowed;
}

.anchor-event-radio-card-carousel--dragging
  .anchor-event-radio-card-carousel__option {
  transition: none;
}

.anchor-event-radio-card-carousel :deep(.event-card) {
  min-height: 100%;
}

@media (max-width: 768px) {
  .anchor-event-radio-card-carousel {
    --anchor-event-carousel-card-width: min(
      calc(100% - (2 * var(--sys-spacing-sm))),
      18rem
    );
  }

  .anchor-event-radio-card-carousel__viewport {
    padding-inline: var(--sys-spacing-sm);
  }
}

@media (prefers-reduced-motion: reduce) {
  .anchor-event-radio-card-carousel__option {
    transition: none;
  }
}
</style>
