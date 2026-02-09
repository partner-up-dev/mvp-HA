<template>
  <button
    class="submit-button"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <span v-if="loading" class="spinner" />
    <slot>{{ t("common.submit") }}</slot>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps<{
  loading?: boolean;
  disabled?: boolean;
}>();

defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.submit-button {
  @include mx.pu-font(label-large);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-sm);
  width: 100%;
  padding: var(--sys-spacing-med);
  border: none;
  border-radius: var(--sys-radius-xs);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
  }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
