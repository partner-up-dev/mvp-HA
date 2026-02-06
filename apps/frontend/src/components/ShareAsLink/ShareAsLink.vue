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
          success: shareState === 'copied',
          error: shareState === 'error',
        }"
        @click="handleCopyLink"
        :disabled="shareState !== 'idle'"
      >
        {{ buttonLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { copyToClipboard, normalizeUrl } from "./ShareAsLink";

interface Props {
  shareUrl: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

type ShareState = "idle" | "copied" | "error";
const shareState = ref<ShareState>("idle");

const baseHref = computed(() => {
  if (typeof window === "undefined") return "http://localhost/";
  return window.location.href;
});

const normalizedUrl = computed(() =>
  normalizeUrl(props.shareUrl, baseHref.value),
);

const buttonLabel = computed(() => {
  if (shareState.value === "copied") return t("common.copied");
  if (shareState.value === "error") return t("share.asLink.shareFailed");
  return t("share.asLink.copyButton");
});

const flashState = (next: ShareState): void => {
  shareState.value = next;
  window.setTimeout(() => {
    shareState.value = "idle";
  }, 2000);
};

const handleCopyLink = async (): Promise<void> => {
  try {
    await copyToClipboard(normalizedUrl.value);
    flashState("copied");
  } catch (error) {
    console.error("Failed to copy:", error);
    flashState("error");
  }
};
</script>

<style scoped lang="scss" src="./ShareAsLink.scss"></style>
