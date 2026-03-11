<template>
  <button
    class="ui-button"
    :class="[
      `ui-button--${variant}`,
      { 'ui-button--full-width': fullWidth, 'is-loading': loading },
    ]"
    :type="type"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="ui-button__spinner" aria-hidden="true"></span>
    <span class="ui-button__content">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    variant?: "primary" | "secondary";
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    type: "button",
    variant: "primary",
    loading: false,
    disabled: false,
    fullWidth: false,
  },
);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style lang="scss" scoped>
.ui-button {
  @include mx.pu-font(label-large);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--dcs-space-control-gap-inline);
  @include mx.pu-cta;
  border: none;
  cursor: pointer;
  transition:
    filter 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
  }
}

.ui-button--full-width {
  width: 100%;
}

.ui-button--primary {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);

  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }
}

.ui-button--secondary {
  border: 1px solid var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);

  &:hover:not(:disabled) {
    background: var(--sys-color-surface-container);
  }
}

.ui-button__content {
  min-width: 0;
}

.ui-button__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ui-button-spin 0.8s linear infinite;
}

@keyframes ui-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
