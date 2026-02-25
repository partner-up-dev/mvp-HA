<template>
  <div class="xiaohongshu-method">
    <!-- Options Section -->
    <div v-if="prData" class="options-section">
      <button
        class="refresh-btn"
        @click="handleRegenerate"
        :disabled="isCaptionGenerating"
      >
        {{
          isCaptionGenerating
            ? t("share.xiaohongshu.generating")
            : `🔄 ${t("share.xiaohongshu.regenerateButton")}`
        }}
      </button>
    </div>

    <!-- Preview Section -->
    <div class="xiaohongshu-preview">
      <!-- Caption Editor -->
      <textarea
        :value="caption?.caption"
        rows="3"
        class="caption-textarea"
        :class="{ transitioning: isTransitioning }"
        :placeholder="t('share.xiaohongshu.captionPlaceholder')"
        :disabled="isCaptionGenerating"
        @input="handleCaptionUpdate"
        @blur="handleCaptionBlur"
      ></textarea>

      <!-- Poster Preview -->
      <div class="poster-preview">
        <div v-if="posterUrl" class="poster-container">
          <div class="poster-image-wrapper">
            <img
              :src="posterUrl"
              :alt="t('share.xiaohongshu.posterAlt')"
              class="poster-image"
              :class="{
                'poster-transitioning': isPosterTransitioning,
                'poster-loading': posterIsGenerating,
              }"
              @error="handlePosterLoadError"
            />
            <div v-if="posterIsGenerating" class="poster-loading-overlay">
              <div class="spinner"></div>
            </div>
          </div>
          <div class="guidance-text">
            <p>📱 {{ t("share.xiaohongshu.saveHint") }}</p>
          </div>
        </div>
        <div v-else-if="posterIsGenerating" class="generating-state">
          <div class="poster-placeholder">
            <div class="spinner"></div>
            <p>🎨 {{ t("share.xiaohongshu.posterGenerating") }}</p>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>{{ t("share.xiaohongshu.posterNotGenerated") }}</p>
        </div>
      </div>
    </div>

    <!-- Actions Section -->
    <div class="action-section">
      <div class="actions-row">
        <button
          class="outline-btn copy-caption-btn"
          :class="{
            success: copyState === 'copied',
            error: copyState === 'error',
          }"
          @click="handleCopyCaptionWithUrl"
          :disabled="!caption?.caption || copyState !== 'idle'"
        >
          {{ copyButtonLabel }}
        </button>
        <button
          class="outline-btn download-poster-btn"
          @click="handleDownloadPoster"
          :disabled="!caption?.caption || posterIsGenerating || inWeChatBrowser"
        >
          {{ downloadButtonLabel }}
        </button>
      </div>
      <button class="primary-btn" @click="handleOpenApp">
        {{ t("share.xiaohongshu.openAppButton") }}
        <div class="i-mdi-arrow-top-right"></div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PRShareProps } from "@/components/share/types";
import { useShareToXiaohongshu } from "@/features/share/xhs/useShareToXiaohongshu";

const props = defineProps<PRShareProps>();
const { t } = useI18n();

const {
  caption,
  posterUrl,
  posterIsGenerating,
  isCaptionGenerating,
  isTransitioning,
  isPosterTransitioning,
  copyState,
  copyButtonLabel,
  downloadButtonLabel,
  inWeChatBrowser,
  handleRegenerate,
  handleCaptionUpdate,
  handleCaptionBlur,
  handlePosterLoadError,
  handleCopyCaptionWithUrl,
  handleDownloadPoster,
  handleOpenApp,
} = useShareToXiaohongshu({
  prId: props.prId,
  shareUrl: props.shareUrl,
  prData: props.prData,
  t,
});
</script>

<style scoped lang="scss" src="./ShareToXiaohongshu.scss"></style>
