<template>
  <button class="share-button" @click="handleShare">
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  url: string;
  title?: string;
  text?: string;
}>();

type ShareState = "idle" | "copied" | "error";
const state = ref<ShareState>("idle");

const label = computed(() => {
  if (state.value === "copied") return "已复制!";
  if (state.value === "error") return "分享失败";
  return "分享链接";
});

const isAbortError = (err: unknown): boolean => {
  return err instanceof DOMException && err.name === "AbortError";
};

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
  state.value = next;
  window.setTimeout(() => {
    state.value = "idle";
  }, 2000);
};

const handleShare = async () => {
  try {
    const url = normalizeUrl(props.url);
    const data: ShareData = {
      title: props.title ?? "搭一把",
      text: props.text,
      url,
    };

    if (typeof navigator.share === "function") {
      const canShare =
        typeof navigator.canShare === "function"
          ? navigator.canShare(data)
          : true;

      if (canShare) {
        try {
          await navigator.share(data);
          return;
        } catch (err: unknown) {
          if (isAbortError(err)) return;
          // fall back to copy
        }
      }
    }

    await copyToClipboard(url);
    flashState("copied");
  } catch {
    flashState("error");

    try {
      window.prompt("复制链接分享：", normalizeUrl(props.url));
    } catch {
      // ignore
    }
  }
};
</script>

<style lang="scss" scoped>
.share-button {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: none;
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;

  &:hover {
    filter: brightness(0.95);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-on-primary);
    outline-offset: 2px;
  }
}
</style>
