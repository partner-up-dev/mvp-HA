<template>
  <div class="action-section">
    <button
      class="action-btn"
      :class="{
        success: state === 'copied',
        error: state === 'error',
      }"
      @click="handleClick"
      :disabled="state !== 'idle'"
    >
      {{ label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type ShareState = "idle" | "copied" | "error";

interface Props {
  onClick: () => Promise<void>;
  state: ShareState;
}

const props = defineProps<Props>();

const label = computed(() => {
  if (props.state === "copied") return "已复制!";
  if (props.state === "error") return "分享失败";
  return "复制链接";
});

const handleClick = async () => {
  await props.onClick();
};
</script>

<style lang="scss" scoped>
.action-section {
  display: flex;
}

.action-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: none;
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &:disabled {
    cursor: not-allowed;
  }

  &.success {
    background: var(--sys-color-tertiary);
    color: var(--sys-color-on-tertiary);
  }

  &.error {
    background: var(--sys-color-error);
    color: var(--sys-color-on-error);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-on-primary);
    outline-offset: 2px;
  }
}
</style>
