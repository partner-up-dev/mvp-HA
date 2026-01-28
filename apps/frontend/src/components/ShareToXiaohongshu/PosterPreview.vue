<template>
  <div class="poster-preview">
    <div v-if="isGenerating" class="generating-state">
      <div class="spinner"></div>
      <p>🎨 生成海报中...</p>
    </div>
    <div v-else-if="posterUrl" class="poster-container">
      <img :src="posterUrl" alt="分享海报" class="poster-image" />
      <div class="guidance-text">
        <p>📱 长按图片保存到相册</p>
        <p class="sub-text">或分享到您的小红书</p>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>尚未生成海报</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  caption: string;
  posterUrl: string | null;
  isGenerating: boolean;
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.poster-preview {
  width: 100%;
}

.generating-state {
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

.poster-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sys-spacing-med);
}

.poster-image {
  width: 100%;
  max-width: 300px;
  height: auto;
  border-radius: var(--sys-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.guidance-text {
  text-align: center;
  color: var(--sys-color-on-surface-variant);

  p {
    margin: var(--sys-spacing-xs) 0;
    font-size: 14px;
  }

  .sub-text {
    font-size: 12px;
    opacity: 0.8;
  }
}

.empty-state {
  text-align: center;
  padding: var(--sys-spacing-lg);
  color: var(--sys-color-on-surface-variant);
}

.action-btn {
  width: 100%;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  border: none;
  border-radius: var(--sys-radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &:active {
    transform: scale(0.98);
  }
}
</style>
