<template>
  <section class="share-pr">
    <!-- Carousel Header -->
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

    <!-- Content Section -->
    <div class="content-section">
      <ShareAsLinkMethod
        v-show="currentMethod.id === 'COPY_LINK'"
        :share-url="shareUrl"
      />
      <ShareToXiaohongshuMethod
        v-show="currentMethod.id === 'XIAOHONGSHU'"
        :share-url="shareUrl"
        :pr-data="prData?.parsed ?? ({} as ParsedPartnerRequest)"
      />
      <div v-show="!currentMethod.id" class="empty-state">
        <p>该分享方式暂不可用</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import ShareAsLinkMethod from "./ShareAsLink/Method.vue";
import ShareToXiaohongshuMethod from "./ShareToXiaohongshu/ShareToXiaohongshu.vue";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

interface ShareMethod {
  id: "COPY_LINK" | "XIAOHONGSHU";
  label: string;
  enabled: boolean;
}

interface Props {
  shareUrl: string;
  prData?: {
    parsed?: ParsedPartnerRequest;
  };
}

const props = defineProps<Props>();

const currentMethodIndex = ref(1);

const allMethods = computed<ShareMethod[]>(() => [
  {
    id: "COPY_LINK",
    label: "链接分享",
    enabled: true,
  },
  {
    id: "XIAOHONGSHU",
    label: "分享到小红书",
    enabled: !!props.prData?.parsed,
  },
]);

const enabledMethods = computed(() =>
  allMethods.value.filter((m) => m.enabled),
);

const currentMethod = computed(() => {
  const enabled = enabledMethods.value;
  if (enabled.length === 0) {
    return allMethods.value[0];
  }
  const normalizedIndex = currentMethodIndex.value % enabled.length;
  return enabled[normalizedIndex];
});

const goToPrevMethod = (): void => {
  if (enabledMethods.value.length <= 1) return;
  currentMethodIndex.value =
    (currentMethodIndex.value - 1 + enabledMethods.value.length) %
    enabledMethods.value.length;
};

const goToNextMethod = (): void => {
  if (enabledMethods.value.length <= 1) return;
  currentMethodIndex.value =
    (currentMethodIndex.value + 1) % enabledMethods.value.length;
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
