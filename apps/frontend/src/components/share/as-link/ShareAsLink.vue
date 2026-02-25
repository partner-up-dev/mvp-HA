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
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { copyToClipboard } from "@/lib/clipboard";
import { normalizeUrl } from "./ShareAsLink";

interface Props {
  shareUrl: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

type ShareState = "idle" | "sharing" | "shared" | "copied" | "error";
const shareState = ref<ShareState>("idle");

const baseHref = computed(() => {
  if (typeof window === "undefined") return "http://localhost/";
  return window.location.href;
});

const normalizedUrl = computed(() =>
  normalizeUrl(props.shareUrl, baseHref.value),
);

const buttonLabel = computed(() => {
  if (shareState.value === "sharing") return t("common.loading");
  if (shareState.value === "shared") return t("share.asLink.shared");
  if (shareState.value === "copied") return t("common.copied");
  if (shareState.value === "error") return t("share.asLink.shareFailed");
  return t("share.asLink.shareButton");
});

const flashState = (next: ShareState): void => {
  shareState.value = next;
  window.setTimeout(() => {
    shareState.value = "idle";
  }, 2000);
};

const getShareData = (): ShareData => {
  const title = typeof document === "undefined" ? undefined : document.title;
  return {
    title,
    url: normalizedUrl.value,
  };
};

const isShareAbortError = (error: unknown): boolean => {
  return (
    error instanceof DOMException
      ? error.name === "AbortError"
      : Boolean(
          typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError",
        )
  );
};

const tryNativeShare = async (): Promise<boolean> => {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function")
    return false;
  await navigator.share(getShareData());
  return true;
};

const handleShare = async (): Promise<void> => {
  if (shareState.value === "sharing") return;

  shareState.value = "sharing";

  try {
    const didShare = await tryNativeShare();
    if (didShare) {
      flashState("shared");
      return;
    }
  } catch (error) {
    if (isShareAbortError(error)) {
      shareState.value = "idle";
      return;
    }
    console.error("Native share failed, fallback to copy:", error);
  }

  try {
    await copyToClipboard(normalizedUrl.value);
    flashState("copied");
  } catch (error) {
    console.error("Failed to share/copy:", error);
    flashState("error");
  }
};
</script>

<style scoped lang="scss" src="./ShareAsLink.scss"></style>
