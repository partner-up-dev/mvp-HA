<template>
  <div class="poster-preview">
    <div v-if="isGenerating" class="generating-state">
      <div class="poster-placeholder">
        <div class="spinner"></div>
        <p>🎨 生成海报中...</p>
      </div>
    </div>
    <div v-else-if="posterUrl" class="poster-container">
      <img
        :src="posterUrl"
        alt="分享海报"
        class="poster-image"
        :class="{ 'poster-transitioning': isTransitioning }"
      />
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
  isTransitioning: boolean;
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
  gap: var(--sys-spacing-med);

  .poster-placeholder {
    width: 100%;
    max-width: 300px;
    aspect-ratio: 3 / 4; // 540:720 ratio
    background: linear-gradient(
      135deg,
      var(--sys-color-surface-variant) 0%,
      var(--sys-color-surface) 100%
    );
    border-radius: var(--sys-radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sys-spacing-med);
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 100%
      );
      animation: shimmer 2s infinite;
    }
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--sys-color-surface-variant);
    border-top-color: var(--sys-color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    z-index: 1;
  }

  p {
    color: var(--sys-color-on-surface-variant);
    margin: 0;
    z-index: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes poster-appear {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
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
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;

  &.poster-transitioning {
    opacity: 0;
    transform: scale(0.95);
    animation: poster-appear 0.3s ease forwards;
  }
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
