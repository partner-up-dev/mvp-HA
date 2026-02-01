<template>
  <section class="share-pr">
    <div class="carousel-header">
      <button
        class="nav-btn"
        @click="goToPrevMethod"
        :disabled="enabledMethods.length <= 1"
        aria-label="上一个分享方式"
      >
        <div class="i-mdi-chevron-left"></div>
      </button>
      <h3 class="method-label">{{ currentMethod.label }}</h3>
      <button
        class="nav-btn"
        @click="goToNextMethod"
        :disabled="enabledMethods.length <= 1"
        aria-label="下一个分享方式"
      >
        <div class="i-mdi-chevron-right"></div>
      </button>
    </div>

    <div class="content-section">
      <ShareAsLink
        v-if="currentMethod.id === 'COPY_LINK'"
        :share-url="shareUrl"
      />

      <ShareToWechatChatMethod
        v-else-if="currentMethod.id === 'WECHAT_CHAT' && prData?.parsed && prData.rawText"
        :share-url="shareUrl"
        :raw-text="prData.rawText"
        :pr-data="prData.parsed"
      />

      <ShareToXiaohongshuMethod
        v-else-if="currentMethod.id === 'XIAOHONGSHU' && prData?.parsed"
        :share-url="shareUrl"
        :pr-data="prData.parsed"
      />

      <div v-else class="empty-state">
        <p>该分享方式暂不可用</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import ShareAsLink from "./ShareAsLink/ShareAsLink.vue";
import ShareToXiaohongshuMethod from "./ShareToXiaohongshu/ShareToXiaohongshu.vue";
import ShareToWechatChatMethod from "./ShareToWechatChat/ShareToWechatChat.vue";
import { isWeChatBrowser } from "@/lib/browser-detection";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

type ShareMethodId = "COPY_LINK" | "XIAOHONGSHU" | "WECHAT_CHAT";

interface ShareMethod {
  id: ShareMethodId;
  label: string;
  enabled: boolean;
}

interface Props {
  shareUrl: string;
  prData?: {
    parsed?: ParsedPartnerRequest;
    rawText?: string;
  };
}

const props = defineProps<Props>();

const allMethods = computed<ShareMethod[]>(() => [
  { id: "COPY_LINK", label: "链接分享", enabled: true },
  {
    id: "WECHAT_CHAT",
    label: "分享到微信",
    enabled: isWeChatBrowser() && !!props.prData?.parsed && !!props.prData?.rawText,
  },
  {
    id: "XIAOHONGSHU",
    label: "分享到小红书",
    enabled: !!props.prData?.parsed,
  },
]);

const enabledMethods = computed(() => allMethods.value.filter((m) => m.enabled));

const currentMethodId = ref<ShareMethodId>("COPY_LINK");

watchEffect(() => {
  const enabled = enabledMethods.value;
  if (enabled.length === 0) {
    currentMethodId.value = "COPY_LINK";
    return;
  }

  const stillEnabled = enabled.some((m) => m.id === currentMethodId.value);
  if (!stillEnabled) {
    currentMethodId.value = enabled[0].id;
  }
});

const currentMethod = computed(() => {
  const enabled = enabledMethods.value;
  return (
    enabled.find((m) => m.id === currentMethodId.value) ??
    enabled[0] ??
    { id: "COPY_LINK", label: "链接分享", enabled: true }
  );
});

const goToPrevMethod = (): void => {
  const enabled = enabledMethods.value;
  if (enabled.length <= 1) return;

  const currentIndex = Math.max(
    0,
    enabled.findIndex((m) => m.id === currentMethod.value.id),
  );
  const prevIndex = (currentIndex - 1 + enabled.length) % enabled.length;
  currentMethodId.value = enabled[prevIndex].id;
};

const goToNextMethod = (): void => {
  const enabled = enabledMethods.value;
  if (enabled.length <= 1) return;

  const currentIndex = Math.max(
    0,
    enabled.findIndex((m) => m.id === currentMethod.value.id),
  );
  const nextIndex = (currentIndex + 1) % enabled.length;
  currentMethodId.value = enabled[nextIndex].id;
};
</script>

<style lang="scss" scoped>
.share-pr {
  margin-top: var(--sys-spacing-lg);
  padding: var(--sys-spacing-sm);
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
  @include mx.pu-font(body-large);
  color: var(--sys-color-on-surface);
  margin: 0;
  flex: 1;
  text-align: center;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.empty-state {
  padding: var(--sys-spacing-med);
  text-align: center;
  color: var(--sys-color-on-surface-variant);
  background: var(--sys-color-surface-container);
  border-radius: var(--sys-radius-sm);

  p {
    margin: 0;
  }
}
</style>
