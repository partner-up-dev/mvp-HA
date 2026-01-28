<template>
  <div class="preview-section">
    <h4 class="preview-title">将复制的内容</h4>
    <div class="preview-content">
      <pre class="preview-text">{{ content }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  content: string;
}

defineProps<Props>();
</script>

<style lang="scss" scoped>
.preview-section {
  margin-bottom: var(--sys-spacing-med);
}

.preview-title {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  margin: 0 0 var(--sys-spacing-xs) 0;
}

.preview-content {
  padding: var(--sys-spacing-sm);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface);
  border: 1px solid var(--sys-color-outline-variant);
  overflow-x: auto;
}

.preview-text {
  @include mx.pu-font(body-large);
  font-family: var(--sys-font-family-mono);
  color: var(--sys-color-on-surface);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
