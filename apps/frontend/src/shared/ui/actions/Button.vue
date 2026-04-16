<template>
  <button
    class="ui-button"
    :class="[
      `ui-button--appearance-${props.appearance}`,
      `ui-button--tone-${resolvedTone}`,
      `ui-button--size-${props.size}`,
      {
        'ui-button--block': isBlock,
        'ui-button--full-width': isBlock,
        'is-loading': props.loading,
      },
    ]"
    :type="props.type"
    :disabled="props.disabled || props.loading"
    @click="$emit('click', $event)"
  >
    <span
      v-if="$slots.leading && !props.loading"
      class="ui-button__leading"
      aria-hidden="true"
    >
      <slot name="leading" />
    </span>
    <span
      v-if="props.loading"
      class="ui-button__spinner"
      aria-hidden="true"
    ></span>
    <span class="ui-button__content">
      <slot />
    </span>
    <span
      v-if="$slots.trailing && !props.loading"
      class="ui-button__trailing"
      aria-hidden="true"
    >
      <slot name="trailing" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

type ButtonAppearance = "rect" | "pill";
type ButtonTone =
  | "primary"
  | "secondary"
  | "outline"
  | "surface"
  | "danger"
  | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    variant?: "primary" | "secondary";
    appearance?: ButtonAppearance;
    tone?: ButtonTone;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    type: "button",
    variant: undefined,
    appearance: "rect",
    tone: undefined,
    size: "md",
    loading: false,
    disabled: false,
    block: false,
    fullWidth: false,
  },
);

const resolvedTone = computed<ButtonTone>(() => {
  if (props.tone) {
    return props.tone;
  }
  return props.variant === "secondary" ? "secondary" : "primary";
});

const isBlock = computed(() => props.block || props.fullWidth);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style lang="scss" scoped>
.ui-button {
  position: relative;
  min-width: 0;
  border: 1px solid transparent;
  text-decoration: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    opacity 180ms ease,
    filter 180ms ease;

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ui-button--block,
.ui-button--full-width {
  width: 100%;
}

.ui-button--appearance-rect {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xs);
  border-radius: var(--sys-radius-sm);
}

.ui-button--appearance-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xs);
  border-radius: 999px;
}

.ui-button--appearance-rect.ui-button--tone-primary {
  @include mx.pu-rect-action(primary, default);
}

.ui-button--appearance-rect.ui-button--tone-secondary {
  @include mx.pu-rect-action(outline-primary, default);
}

.ui-button--appearance-rect.ui-button--tone-outline {
  @include mx.pu-rect-action(outline, default);
}

.ui-button--appearance-rect.ui-button--tone-surface {
  @include mx.pu-rect-action(surface, default);
}

.ui-button--appearance-rect.ui-button--tone-danger {
  @include mx.pu-rect-action(danger, default);
}

.ui-button--appearance-rect.ui-button--tone-ghost {
  background: transparent;
  color: var(--sys-color-on-surface);

  &:hover:not(:disabled) {
    background: var(--sys-color-surface-container-high);
  }
}

.ui-button--appearance-pill.ui-button--tone-primary {
  @include mx.pu-pill-action(solid-primary, default);
}

.ui-button--appearance-pill.ui-button--tone-secondary {
  @include mx.pu-pill-action(solid-secondary, default);
}

.ui-button--appearance-pill.ui-button--tone-outline {
  @include mx.pu-pill-action(outline-transparent, default);
}

.ui-button--appearance-pill.ui-button--tone-surface {
  background: var(--sys-color-surface-container-lowest);
  border-color: var(--sys-color-outline-variant);
  color: var(--sys-color-on-surface);
}

.ui-button--appearance-pill.ui-button--tone-danger {
  background: transparent;
  border-color: var(--sys-color-error);
  color: var(--sys-color-error);
}

.ui-button--appearance-pill.ui-button--tone-ghost {
  @include mx.pu-pill-action(transparent, default);
}

.ui-button--size-sm {
  @include mx.pu-font(label-medium);
}

.ui-button--size-md {
  @include mx.pu-font(label-large);
}

.ui-button--size-lg {
  @include mx.pu-font(title-small);
}

.ui-button--appearance-rect.ui-button--size-sm {
  min-height: var(--sys-size-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
}

.ui-button--appearance-rect.ui-button--size-md {
  min-height: var(--sys-size-large);
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
}

.ui-button--appearance-rect.ui-button--size-lg {
  min-height: calc(var(--sys-size-large) + var(--sys-spacing-sm));
  padding: var(--sys-spacing-med) var(--sys-spacing-lg);
}

.ui-button--appearance-pill.ui-button--size-sm {
  min-height: var(--sys-size-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
}

.ui-button--appearance-pill.ui-button--size-md {
  min-height: var(--sys-size-large);
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
}

.ui-button--appearance-pill.ui-button--size-lg {
  min-height: calc(var(--sys-size-large) + var(--sys-spacing-sm));
  padding: var(--sys-spacing-sm) var(--sys-spacing-lg);
}

.ui-button--appearance-pill.ui-button--tone-surface:hover:not(:disabled),
.ui-button--appearance-pill.ui-button--tone-danger:hover:not(:disabled),
.ui-button--appearance-pill.ui-button--tone-ghost:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-primary:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-secondary:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-outline:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-surface:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-danger:hover:not(:disabled) {
  filter: brightness(0.98);
}

.ui-button:active:not(:disabled) {
  transform: scale(0.99);
}

.ui-button__content {
  min-width: 0;
}

.ui-button__leading,
.ui-button__trailing,
.ui-button__spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ui-button__leading :deep([class^="i-"]),
.ui-button__leading :deep([class*=" i-"]),
.ui-button__trailing :deep([class^="i-"]),
.ui-button__trailing :deep([class*=" i-"]) {
  @include mx.pu-icon(sm);
}

.ui-button__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ui-button-spin 0.8s linear infinite;
}

.is-loading .ui-button__content {
  opacity: 0.92;
}

@media (prefers-reduced-motion: reduce) {
  .ui-button,
  .ui-button__spinner {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes ui-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
