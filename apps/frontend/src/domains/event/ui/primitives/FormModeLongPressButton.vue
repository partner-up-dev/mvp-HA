<template>
  <button
    ref="buttonRef"
    class="form-mode-long-press-button"
    :class="{
      'form-mode-long-press-button--disabled': props.disabled || props.pending,
      'form-mode-long-press-button--charging': phase === 'CHARGING',
      'form-mode-long-press-button--overload': phase === 'OVERLOAD',
      'form-mode-long-press-button--burst': phase === 'BURST',
      'form-mode-long-press-button--rollback': phase === 'ROLLBACK',
    }"
    type="button"
    :disabled="props.disabled || props.pending"
    :style="buttonStyle"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
    @pointerleave="handlePointerLeave"
  >
    <span class="form-mode-long-press-button__fill" aria-hidden="true" />
    <span class="form-mode-long-press-button__splash" aria-hidden="true" />
    <span class="form-mode-long-press-button__label">
      {{ props.pending ? props.pendingLabel ?? props.label : props.label }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

type ButtonPhase = "IDLE" | "CHARGING" | "OVERLOAD" | "BURST" | "ROLLBACK";

const props = withDefaults(
  defineProps<{
    label: string;
    pending?: boolean;
    pendingLabel?: string;
    disabled?: boolean;
    chargeDurationMs?: number;
    overloadDurationMs?: number;
  }>(),
  {
    pending: false,
    pendingLabel: undefined,
    disabled: false,
    chargeDurationMs: 760,
    overloadDurationMs: 240,
  },
);

const emit = defineEmits<{
  complete: [];
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);
const phase = ref<ButtonPhase>("IDLE");
const fillProgress = ref(0);
const overloadProgress = ref(0);
const pointerId = ref<number | null>(null);
const startedAt = ref(0);
const rafId = ref<number | null>(null);
const hasCompleted = ref(false);

const clearAnimationFrame = () => {
  if (rafId.value !== null && typeof window !== "undefined") {
    window.cancelAnimationFrame(rafId.value);
    rafId.value = null;
  }
};

const releasePointerCapture = () => {
  if (pointerId.value === null) {
    return;
  }

  try {
    if (buttonRef.value?.hasPointerCapture(pointerId.value)) {
      buttonRef.value.releasePointerCapture(pointerId.value);
    }
  } catch {
    // Ignore stale pointer-capture errors.
  }
};

const resetToIdle = () => {
  clearAnimationFrame();
  releasePointerCapture();
  pointerId.value = null;
  startedAt.value = 0;
  phase.value = "IDLE";
  fillProgress.value = 0;
  overloadProgress.value = 0;
  hasCompleted.value = false;
};

const easing = (value: number): number => 1 - (1 - value) ** 2.2;

const runTick = (timestamp: number) => {
  if (startedAt.value === 0) {
    startedAt.value = timestamp;
  }

  const elapsed = timestamp - startedAt.value;
  if (elapsed < props.chargeDurationMs) {
    phase.value = "CHARGING";
    fillProgress.value = easing(elapsed / props.chargeDurationMs);
    overloadProgress.value = 0;
    rafId.value = window.requestAnimationFrame(runTick);
    return;
  }

  fillProgress.value = 1;
  const overloadElapsed = elapsed - props.chargeDurationMs;
  if (overloadElapsed < props.overloadDurationMs) {
    phase.value = "OVERLOAD";
    overloadProgress.value = overloadElapsed / props.overloadDurationMs;
    rafId.value = window.requestAnimationFrame(runTick);
    return;
  }

  if (!hasCompleted.value) {
    hasCompleted.value = true;
    phase.value = "BURST";
    overloadProgress.value = 1;
    emit("complete");
  }

  clearAnimationFrame();
  window.setTimeout(() => {
    if (phase.value === "BURST") {
      resetToIdle();
    }
  }, 420);
};

const startCharging = (event: PointerEvent) => {
  if (props.disabled || props.pending) {
    return;
  }

  clearAnimationFrame();
  hasCompleted.value = false;
  pointerId.value = event.pointerId;
  startedAt.value = 0;
  phase.value = "CHARGING";
  fillProgress.value = 0;
  overloadProgress.value = 0;

  try {
    buttonRef.value?.setPointerCapture(event.pointerId);
  } catch {
    // Ignore capture failures.
  }

  rafId.value = window.requestAnimationFrame(runTick);
};

const triggerRollback = () => {
  if (phase.value === "BURST" || phase.value === "IDLE") {
    return;
  }

  clearAnimationFrame();
  releasePointerCapture();
  pointerId.value = null;
  phase.value = "ROLLBACK";
  fillProgress.value = 0;
  overloadProgress.value = 0;
  window.setTimeout(() => {
    if (phase.value === "ROLLBACK") {
      resetToIdle();
    }
  }, 220);
};

const handlePointerDown = (event: PointerEvent) => {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }
  startCharging(event);
};

const handlePointerUp = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return;
  }

  if (phase.value === "BURST") {
    releasePointerCapture();
    pointerId.value = null;
    return;
  }

  triggerRollback();
};

const handlePointerCancel = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return;
  }
  triggerRollback();
};

const handlePointerLeave = (event: PointerEvent) => {
  if (pointerId.value !== event.pointerId) {
    return;
  }
  if (event.pointerType === "mouse") {
    triggerRollback();
  }
};

onBeforeUnmount(() => {
  clearAnimationFrame();
});

const buttonStyle = computed(() => ({
  "--form-mode-long-press-progress": String(fillProgress.value),
  "--form-mode-long-press-overload": String(overloadProgress.value),
}));
</script>

<style lang="scss" scoped>
.form-mode-long-press-button {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3.5rem;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: none;
  border-radius: 0;
  background: color-mix(
    in srgb,
    var(--sys-color-primary) 16%,
    var(--sys-color-surface-container)
  );
  color: var(--sys-color-on-primary-container);
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
  @include mx.pu-font(title-small);
  @include mx.pu-elevation(2);
}

.form-mode-long-press-button__label {
  position: relative;
  z-index: 2;
}

.form-mode-long-press-button__fill,
.form-mode-long-press-button__splash {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.form-mode-long-press-button__fill {
  z-index: 0;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--sys-color-primary) 92%, white),
    var(--sys-color-primary)
  );
  transform-origin: left center;
  transform: scaleX(var(--form-mode-long-press-progress, 0));
  transition: transform 180ms cubic-bezier(0.25, 1, 0.5, 1);
}

.form-mode-long-press-button__splash {
  z-index: 1;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--sys-color-primary) 72%, white) 50%,
    var(--sys-color-primary) 100%
  );
  opacity: 0;
  transform: translateX(calc(-100% + var(--form-mode-long-press-progress, 0) * 100%))
    scaleX(0.1);
}

.form-mode-long-press-button--charging {
  transform: translateY(-1px);
}

.form-mode-long-press-button--overload {
  animation: form-mode-long-press-tremble 92ms linear infinite;
  box-shadow:
    0 0 0 calc(var(--form-mode-long-press-overload, 0) * 8px)
      color-mix(in srgb, var(--sys-color-primary) 18%, transparent),
    0 14px 28px rgba(0, 0, 0, 0.18);
}

.form-mode-long-press-button--burst {
  color: var(--sys-color-on-primary);
}

.form-mode-long-press-button--burst .form-mode-long-press-button__splash {
  opacity: 1;
  transform: translateX(0) scaleX(11);
  transition:
    opacity 120ms ease,
    transform 420ms cubic-bezier(0.12, 0.82, 0.16, 1);
}

.form-mode-long-press-button--rollback .form-mode-long-press-button__fill {
  transition: transform 220ms cubic-bezier(0.2, 1, 0.2, 1);
}

.form-mode-long-press-button--disabled {
  cursor: not-allowed;
  opacity: 0.56;
  box-shadow: none;
}

@keyframes form-mode-long-press-tremble {
  0% {
    transform: translate3d(0, 0, 0);
  }
  25% {
    transform: translate3d(-1px, 0, 0);
  }
  50% {
    transform: translate3d(1px, 0, 0);
  }
  75% {
    transform: translate3d(-1px, 0, 0);
  }
  100% {
    transform: translate3d(0, 0, 0);
  }
}

@media (hover: hover) and (pointer: fine) {
  .form-mode-long-press-button:hover:not(.form-mode-long-press-button--disabled) {
    transform: translateY(-1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .form-mode-long-press-button,
  .form-mode-long-press-button__fill,
  .form-mode-long-press-button__splash {
    transition: none;
  }

  .form-mode-long-press-button--overload {
    animation: none;
  }
}
</style>
