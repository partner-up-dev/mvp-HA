<template>
  <Button
    class="ui-feedback-button"
    :class="`ui-feedback-button--state-${props.state}`"
    :type="props.type"
    :appearance="props.appearance"
    :tone="props.tone"
    :size="props.size"
    :loading="isPending"
    :disabled="props.disabled"
    :block="isBlock"
    @click="$emit('click', $event)"
  >
    <template v-if="$slots.leading" #leading>
      <slot name="leading" />
    </template>
    <slot />
    <template v-if="$slots.trailing" #trailing>
      <slot name="trailing" />
    </template>
  </Button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Button from "@/shared/ui/actions/Button.vue";

type FeedbackButtonAppearance = "rect" | "pill";
type FeedbackButtonTone =
  | "primary"
  | "secondary"
  | "outline"
  | "surface"
  | "danger"
  | "ghost";
type FeedbackButtonSize = "sm" | "md" | "lg";
type FeedbackButtonState = "idle" | "pending" | "success" | "error";

const props = withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    appearance?: FeedbackButtonAppearance;
    tone?: FeedbackButtonTone;
    size?: FeedbackButtonSize;
    state?: FeedbackButtonState;
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    type: "button",
    appearance: "rect",
    tone: "primary",
    size: "md",
    state: "idle",
    loading: false,
    disabled: false,
    block: false,
    fullWidth: false,
  },
);

const isPending = computed(() => props.loading || props.state === "pending");
const isBlock = computed(() => props.block || props.fullWidth);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style lang="scss" scoped>
.ui-button.ui-feedback-button.ui-feedback-button--state-success {
  background: var(--sys-color-tertiary);
  border-color: var(--sys-color-tertiary);
  color: var(--sys-color-on-tertiary);
  opacity: 1;
}

.ui-button.ui-feedback-button.ui-feedback-button--state-error {
  background: var(--sys-color-error);
  border-color: var(--sys-color-error);
  color: var(--sys-color-on-error);
  opacity: 1;
}

.ui-button.ui-feedback-button.ui-feedback-button--state-pending {
  opacity: 1;
}

.ui-button.ui-feedback-button.ui-feedback-button--state-success:hover:not(:disabled),
.ui-button.ui-feedback-button.ui-feedback-button--state-error:hover:not(:disabled) {
  filter: brightness(0.98);
}
</style>
