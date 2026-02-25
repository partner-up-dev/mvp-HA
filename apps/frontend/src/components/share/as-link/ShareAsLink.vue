<template>
  <div class="share-as-link">
    <!-- Preview Section -->
    <div class="preview-section">
      <h4 class="preview-title">{{ t("share.asLink.previewTitle") }}</h4>
      <div class="preview-content">
        <pre class="preview-text">{{ normalizedUrl }}</pre>
      </div>
    </div>

    <!-- Actions Section -->
    <div class="action-section">
      <button
        class="action-btn"
        :class="{
          success: shareState === 'shared' || shareState === 'copied',
          error: shareState === 'error',
        }"
        @click="handleShare"
        :disabled="shareState !== 'idle'"
      >
        {{ buttonLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useShareAsLink } from "@/features/share/as-link/useShareAsLink";

interface Props {
  shareUrl: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

const {
  shareState,
  normalizedUrl,
  buttonLabel,
  handleShare,
} = useShareAsLink({
  shareUrl: () => props.shareUrl,
  getLoadingText: () => t("common.loading"),
  getSharedText: () => t("share.asLink.shared"),
  getCopiedText: () => t("common.copied"),
  getShareFailedText: () => t("share.asLink.shareFailed"),
  getShareButtonText: () => t("share.asLink.shareButton"),
});
</script>

<style scoped lang="scss" src="./ShareAsLink.scss"></style>
