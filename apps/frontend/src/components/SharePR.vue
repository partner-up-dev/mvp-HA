<template>
  <section class="share-pr">
    <!-- Carousel Header -->
    <div class="carousel-header">
      <button
        class="nav-btn"
        @click="goToPrevMethod"
        :disabled="shareMethods.length <= 1"
        aria-label="上一个分享方式"
      >
        <div class="i-mdi-chevron-left"></div>
      </button>
      <h3 class="method-label">{{ currentMethod.label }}</h3>
      <button
        class="nav-btn"
        @click="goToNextMethod"
        :disabled="shareMethods.length <= 1"
        aria-label="下一个分享方式"
      >
        <div class="i-mdi-chevron-right"></div>
      </button>
    </div>

    <!-- Options Section (for future methods) -->
    <div v-if="currentMethod.options" class="options-section">
      <component :is="currentMethod.options" />
    </div>

    <!-- Content Preview -->
    <div class="preview-section">
      <h4 class="preview-title">将复制的内容</h4>
      <div class="preview-content">
        <pre class="preview-text">{{ previewContent }}</pre>
      </div>
    </div>

    <!-- Action Button -->
    <div class="action-section">
      <button
        class="action-btn"
        :class="{
          success: shareState === 'copied',
          error: shareState === 'error',
        }"
        @click="handleShare"
        :disabled="shareState !== 'idle'"
      >
        {{ actionLabel }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, type Component } from "vue";

interface ShareMethod {
  id: string;
  label: string;
  options?: Component;
  action: () => Promise<void>;
  getPreviewContent: () => string;
}

interface Props {
  shareUrl: string;
}

const props = defineProps<Props>();

type ShareState = "idle" | "copied" | "error";
const shareState = ref<ShareState>("idle");
const currentMethodIndex = ref(0);

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

// Utility: Flash state feedback
const flashState = (next: ShareState): void => {
  shareState.value = next;
  window.setTimeout(() => {
    shareState.value = "idle";
  }, 2000);
};

// Normalize URL
const normalizeUrl = (rawUrl: string): string => {
  try {
    return new URL(rawUrl, window.location.href).toString();
  } catch {
    return rawUrl;
  }
};

// Share Methods Registry
const shareMethods = computed<ShareMethod[]>(() => [
  {
    id: "COPY_LINK",
    label: "复制链接",
    action: async () => {
      const url = normalizeUrl(props.shareUrl);
      await copyToClipboard(url);
    },
    getPreviewContent: () => normalizeUrl(props.shareUrl),
  },
  // Future methods can be added here:
  // {
  //   id: "WECHAT",
  //   label: "分享到微信",
  //   action: async () => { /* WeChat share logic */ },
  //   getPreviewContent: () => `${prData.parsed?.title}\n${normalizeUrl(props.shareUrl)}`,
  // },
]);

// Computed
const currentMethod = computed(
  () => shareMethods.value[currentMethodIndex.value],
);
const previewContent = computed(() => currentMethod.value.getPreviewContent());
const actionLabel = computed(() => {
  if (shareState.value === "copied") return "已复制!";
  if (shareState.value === "error") return "分享失败";
  return currentMethod.value.label;
});

// Methods
const goToPrevMethod = (): void => {
  if (shareMethods.value.length <= 1) return;
  currentMethodIndex.value =
    (currentMethodIndex.value - 1 + shareMethods.value.length) %
    shareMethods.value.length;
  shareState.value = "idle";
};

const goToNextMethod = (): void => {
  if (shareMethods.value.length <= 1) return;
  currentMethodIndex.value =
    (currentMethodIndex.value + 1) % shareMethods.value.length;
  shareState.value = "idle";
};

const handleShare = async (): Promise<void> => {
  try {
    await currentMethod.value.action();
    flashState("copied");
  } catch (error) {
    console.error("Share failed:", error);
    flashState("error");
  }
};
</script>

<style lang="scss" scoped>
.share-pr {
  margin-top: var(--sys-spacing-lg);
  padding: var(--sys-spacing-med);
  border-radius: var(--sys-radius-md);
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
}

.carousel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-med);
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--sys-size-large);
  min-height: var(--sys-size-large);
  background: transparent;
  border: none;
  border-radius: 999px;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: var(--sys-color-surface-container-highest);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }

  div {
    font-size: 24px;
  }
}

.method-label {
  @include mx.pu-font(title-medium);
  color: var(--sys-color-on-surface);
  margin: 0;
  flex: 1;
  text-align: center;
}

.options-section {
  margin-bottom: var(--sys-spacing-med);
  padding: var(--sys-spacing-sm);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface);
}

.preview-section {
  margin-bottom: var(--sys-spacing-med);
}

.preview-title {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
  margin: 0 0 var(--sys-spacing-xs) 0;
}

.preview-content {
  padding: var(--sys-spacing-sm);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface);
  border: 1px solid var(--sys-color-outline-variant);
  overflow-x: auto;
}

.preview-text {
  @include mx.pu-font(body-small);
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  color: var(--sys-color-on-surface);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
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
