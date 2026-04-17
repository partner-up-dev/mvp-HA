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
      <FeedbackButton
        class="action-btn"
        :state="feedbackState"
        :disabled="shareState !== 'idle'"
        block
        @click="handleShare"
      >
        {{ buttonLabel }}
      </FeedbackButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useShareAsLink } from "@/domains/share/use-cases/as-link/useShareAsLink";
import FeedbackButton from "@/shared/ui/actions/FeedbackButton.vue";
import type { ShareSpmRouteKey } from "@/shared/url/spm";

interface Props {
  shareUrl: string;
  spmRouteKey: ShareSpmRouteKey;
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
  spmRouteKey: props.spmRouteKey,
  getLoadingText: () => t("common.loading"),
  getSharedText: () => t("share.asLink.shared"),
  getCopiedText: () => t("common.copied"),
  getShareFailedText: () => t("share.asLink.shareFailed"),
  getShareButtonText: () => t("share.asLink.shareButton"),
});

const feedbackState = computed<"idle" | "pending" | "success" | "error">(() => {
  if (shareState.value === "sharing") return "pending";
  if (shareState.value === "shared" || shareState.value === "copied") {
    return "success";
  }
  if (shareState.value === "error") return "error";
  return "idle";
});
</script>

<style scoped lang="scss" src="./ShareAsLink.scss"></style>
