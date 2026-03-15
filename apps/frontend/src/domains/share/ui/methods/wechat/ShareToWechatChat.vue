<template>
  <div class="wechat-chat-method">
    <div class="options-section flex flex-col">
      <button
        class="outline-btn"
        @click="handleGenerateAndUpdate"
        :disabled="isWorking"
      >
        {{ switchButtonLabel }}
      </button>
    </div>

    <div class="preview-section">
      <h4 class="preview-title">{{ t("share.wechat.previewTitle") }}</h4>

      <div class="poster-preview">
        <div v-if="isWorking" class="generating-state">
          <div class="poster-placeholder">
            <div class="spinner"></div>
            <p>{{ t("share.wechat.generating") }}</p>
          </div>
        </div>
        <div v-else>
          <WechatChatPreview
            :poster-url="posterUrl"
            :share-title="shareTitle"
            :share-desc="shareDescPreview"
            :thumb-placeholder="thumbPlaceholder"
            @imageLoadError="handleThumbnailLoadError"
          />
        </div>
      </div>
    </div>

    <div class="action-section">
      <div v-if="errorText" class="error-text">{{ errorText }}</div>
      <div v-else class="guidance-text">
        <p>{{ t("share.wechat.guidanceLine1") }}</p>
        <p class="sub-text">{{ t("share.wechat.guidanceLine2") }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PRShareProps } from "@/domains/share/model/types";
import { useShareToWechatChat } from "@/domains/share/use-cases/wechat/useShareToWechatChat";
import WechatChatPreview from "@/domains/share/ui/primitives/WechatChatPreview.vue";

const props = defineProps<PRShareProps>();
const { t } = useI18n();

const {
  switchButtonLabel,
  isWorking,
  posterUrl,
  shareTitle,
  shareDescPreview,
  thumbPlaceholder,
  errorText,
  handleGenerateAndUpdate,
  handleThumbnailLoadError,
} = useShareToWechatChat({
  prId: props.prId,
  shareUrl: props.shareUrl,
  spmRouteKey: props.spmRouteKey,
  prData: props.prData,
  t,
});
</script>

<style scoped lang="scss" src="./ShareToWechatChat.scss"></style>
