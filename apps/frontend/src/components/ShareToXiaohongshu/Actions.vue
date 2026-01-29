<template>
  <div class="action-section">
    <div class="actions-row">
      <button
        class="outline-btn copy-caption-btn"
        @click="handleCopyCaptionWithUrl"
        :disabled="!currentCaption"
      >
        复制文案
      </button>
      <button
        class="outline-btn download-poster-btn"
        @click="onDownloadPoster"
        :disabled="!currentCaption || posterIsGenerating"
      >
        {{ posterIsGenerating ? "生成中..." : "下载海报" }}
      </button>
    </div>
    <button class="primary-btn" @click="handleOpenApp">
      分享到小红书
      <div class="i-mdi-arrow-top-right"></div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useAppScheme } from "@/composables/useAppScheme";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

interface Props {
  currentCaption: string;
  posterIsGenerating: boolean;
  shareUrl: string;
  prData: ParsedPartnerRequest;
  onDownloadPoster: () => Promise<void>;
}

const props = defineProps<Props>();

const { openXiaohongshu } = useAppScheme();

// Utility: Copy to clipboard
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

const handleCopyCaptionWithUrl = async () => {
  try {
    const content = `${props.currentCaption}\n\n${props.shareUrl}`;
    await copyToClipboard(content);
    alert("✅ 已复制到剪贴板");
  } catch (error) {
    console.error("Failed to copy:", error);
    alert("❌ 复制失败，请重试");
  }
};

const handleOpenApp = () => {
  openXiaohongshu();
};
</script>

<style lang="scss" scoped>
.action-section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.actions-row {
  display: flex;
  gap: var(--sys-spacing-sm);
}

.outline-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: transparent;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--sys-color-surface-container-highest);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.copy-caption-btn,
.download-poster-btn {
  flex: 1;
}

.primary-btn {
  @include mx.pu-font(label-large);
  width: 100%;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline-variant);
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
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-on-primary);
    outline-offset: 2px;
  }
}
</style>
