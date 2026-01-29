<template>
  <textarea
    :value="caption"
    rows="4"
    class="caption-textarea"
    :class="{ transitioning: isTransitioning }"
    placeholder="编辑小红书文案..."
    :disabled="disabled"
    @input="handleInput"
  ></textarea>
</template>

<script setup lang="ts">
interface Props {
  caption: string;
  disabled?: boolean;
  isTransitioning?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  "update:caption": [caption: string];
}>();

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit("update:caption", target.value);
};
</script>

<style scoped lang="scss">
.xiaohongshu-editor {
  width: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--sys-spacing-lg);
  gap: var(--sys-spacing-med);

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--sys-color-surface-variant);
    border-top-color: var(--sys-color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  p {
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.editor-content {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.caption-textarea {
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  transition: opacity 0.3s ease;

  &:focus {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: -2px;
  }

  &.transitioning {
    opacity: 0.7;
  }
}

.regenerate-btn {
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  color: var(--sys-color-on-surface);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: var(--sys-color-surface-container-highest);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: -2px;
  }
}
</style>
