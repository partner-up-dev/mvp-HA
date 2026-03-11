<template>
  <div class="chat-window">
    <div class="chat-row">
      <div class="chat-bubble" :class="{ 'bubble-loading': !posterUrl }">
        <div class="share-card">
          <div class="share-card-text">
            <p class="share-card-title">{{ shareTitle }}</p>
            <p class="share-card-desc">{{ shareDesc }}</p>
          </div>
          <div class="share-card-thumb" :class="{ 'thumb-empty': !posterUrl }">
            <img
              v-if="posterUrl"
              :src="posterUrl"
              :alt="t('share.wechat.thumbAlt')"
              @error="$emit('imageLoadError')"
            />
            <div v-else class="thumb-placeholder">{{ thumbPlaceholder }}</div>
          </div>
        </div>
      </div>
      <div class="chat-avatar">
        <div class="avatar-circle">
          <span>{{ t("share.wechat.selfLabel") }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

interface Props {
  posterUrl: string | null;
  shareTitle: string;
  shareDesc: string;
  thumbPlaceholder: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

defineEmits<{
  imageLoadError: [];
}>();
</script>

<style scoped lang="scss">
.chat-window {
  background: var(--sys-color-surface);
  padding: var(--sys-spacing-lg) var(--sys-spacing-sm);
}

.chat-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: flex-end;
}

.chat-bubble {
  max-width: 82%;
  background: #fff;
  border-radius: 6px;
  padding: 20px 16px;
  position: relative;

  &.bubble-loading {
    background: var(--sys-color-surface-container-highest);
  }
}

.share-card {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
}

.share-card-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.share-card-title {
  font-size: 18px;
  color: #161616;
  margin: 0;
}

.share-card-desc {
  font-size: 16px;
  color: #9e9e9e;
  margin: 0;
}

.share-card-thumb {
  margin-top: auto;
  width: 48px;
  height: 48px;
  border-radius: var(--sys-radius-xs);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.thumb-placeholder {
  font-size: 16px;
  color: #9e9e9e;
}

.thumb-empty {
  border-style: dashed;
}

.chat-avatar {
  flex: 0 0 auto;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
  display: grid;
  place-items: center;
  font-size: 14px;
}
</style>
