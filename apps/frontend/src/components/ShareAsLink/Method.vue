<template>
  <div class="share-as-link-method">
    <!-- Content Preview Section -->
    <TextPreview :content="normalizeUrl(shareUrl)" />

    <!-- Action Section -->
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
import { ref, computed } from "vue";
import TextPreview from "./TextPreview.vue";

interface Props {
  shareUrl: string;
}

const props = defineProps<Props>();

type ShareState = "idle" | "copied" | "error";
const shareState = ref<ShareState>("idle");

const buttonLabel = computed(() => {
  if (shareState.value === "copied") return "已复制!";
  if (shareState.value === "error") return "分享失败";
  return "复制链接";
});

const normalizeUrl = (rawUrl: string): string => {
  try {
    return new URL(rawUrl, window.location.href).toString();
  } catch {
    return rawUrl;
  }
};

const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error("Clipboard copy failed");
  }
};

const flashState = (next: ShareState): void => {
  shareState.value = next;
  window.setTimeout(() => {
    shareState.value = "idle";
  }, 2000);
};

const handleCopyLink = async (): Promise<void> => {
  try {
    const url = normalizeUrl(props.shareUrl);
    await copyToClipboard(url);
    flashState("copied");
  } catch (error) {
    console.error("Failed to copy:", error);
    flashState("error");
  }
};
</script>

<style lang="scss" scoped>
.share-as-link-method {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.action-section {
  display: flex;
}

.action-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: none;
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &:disabled {
    cursor: not-allowed;
  }

  &.success {
    background: var(--sys-color-tertiary);
    color: var(--sys-color-on-tertiary);
  }

  &.error {
    background: var(--sys-color-error);
    color: var(--sys-color-on-error);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-on-primary);
    outline-offset: 2px;
  }
}
</style>
