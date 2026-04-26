<template>
  <div class="inline-notice" :class="`inline-notice--${tone}`" :role="role">
    <span
      class="inline-notice__icon"
      :class="iconClass"
      aria-hidden="true"
    ></span>

    <div class="inline-notice__content">
      <p v-if="title" class="inline-notice__title">{{ title }}</p>
      <p v-if="message" class="inline-notice__message">{{ message }}</p>
      <div v-if="$slots.default" class="inline-notice__body">
        <slot />
      </div>
    </div>

    <button
      v-if="dismissible"
      type="button"
      class="inline-notice__close"
      :aria-label="closeLabel"
      @click="$emit('close')"
    >
      <span class="i-mdi-close" aria-hidden="true"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

type InlineNoticeTone = "info" | "success" | "warning" | "error";

const props = withDefaults(
  defineProps<{
    tone?: InlineNoticeTone;
    title?: string;
    message?: string;
    dismissible?: boolean;
    closeLabel?: string;
  }>(),
  {
    tone: "info",
    title: undefined,
    message: undefined,
    dismissible: false,
    closeLabel: undefined,
  },
);

defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const role = computed(() =>
  props.tone === "error" || props.tone === "warning" ? "alert" : "status",
);

const closeLabel = computed(() => props.closeLabel ?? t("common.close"));

const iconClass = computed(() => {
  if (props.tone === "success") return "i-mdi-check-circle-outline";
  if (props.tone === "warning") return "i-mdi-alert-outline";
  if (props.tone === "error") return "i-mdi-alert-circle-outline";
  return "i-mdi-information-outline";
});
</script>

<style lang="scss" scoped>
.inline-notice {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--sys-spacing-small);
  align-items: start;
  border-radius: var(--sys-radius-medium);
  padding: var(--sys-spacing-small) var(--sys-spacing-small);
}

.inline-notice--info {
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
}

.inline-notice--success {
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
}

.inline-notice--warning {
  background: var(--sys-color-warning);
  color: var(--sys-color-on-warning);
}

.inline-notice--error {
  background: var(--sys-color-error-container);
  color: var(--sys-color-on-error-container);
}

.inline-notice__icon {
  @include mx.pu-icon(medium, true);
  margin-top: 2px;
}

.inline-notice__content {
  min-width: 0;
}

.inline-notice__title,
.inline-notice__message {
  margin: 0;
}

.inline-notice__title {
  @include mx.pu-font(label-large);
}

.inline-notice__message,
.inline-notice__body {
  @include mx.pu-font(body-medium);
}

.inline-notice__body {
  margin-top: var(--sys-spacing-xsmall);
}

.inline-notice__close {
  @include mx.pu-icon(small, true);
  width: var(--sys-size-medium);
  height: var(--sys-size-medium);
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.inline-notice__close:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style>
