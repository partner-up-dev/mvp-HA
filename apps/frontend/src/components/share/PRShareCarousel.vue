<template>
  <section class="share-pr">
    <div class="carousel-header">
      <button
        class="nav-btn"
        @click="goToPrevMethod"
        :disabled="enabledMethods.length <= 1"
        :aria-label="t('share.prevMethodAria')"
      >
        <div class="i-mdi-chevron-left"></div>
      </button>
      <h3 class="method-label">{{ currentMethod.label }}</h3>
      <button
        class="nav-btn"
        @click="goToNextMethod"
        :disabled="enabledMethods.length <= 1"
        :aria-label="t('share.nextMethodAria')"
      >
        <div class="i-mdi-chevron-right"></div>
      </button>
    </div>

    <div
      class="content-section"
      @pointerdown.capture="handleShareMethodInteraction"
      @keydown.capture="handleShareMethodInteraction"
      @input.capture="handleShareMethodInteraction"
    >
      <Transition :name="transitionName">
        <ShareAsLink
          v-show="currentMethod.id === 'WEB_SHARE'"
          class="method-pane"
          :share-url="shareUrl"
        />
      </Transition>

      <Transition :name="transitionName">
        <ShareToWechatChatMethod
          v-show="currentMethod.id === 'WECHAT_CHAT'"
          class="method-pane"
          :share-url="shareUrl"
          :pr-id="prId!"
          :pr-data="shareData"
        />
      </Transition>

      <Transition :name="transitionName">
        <ShareToXiaohongshuMethod
          v-show="currentMethod.id === 'XIAOHONGSHU'"
          class="method-pane"
          :share-url="shareUrl"
          :pr-id="prId!"
          :pr-data="shareData"
        />
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import ShareAsLink from "./as-link/ShareAsLink.vue";
import ShareToXiaohongshuMethod from "./xhs/ShareToXiaohongshu.vue";
import ShareToWechatChatMethod from "./wechat/ShareToWechatChat.vue";
import type { PRShareProps } from "@/components/share/types";

type ShareMethodId = "WEB_SHARE" | "XIAOHONGSHU" | "WECHAT_CHAT";

interface ShareMethod {
  id: ShareMethodId;
  label: string;
  enabled?: boolean;
}

const props = defineProps<PRShareProps>();
const { t } = useI18n();

const allMethods = computed<ShareMethod[]>(() => [
  { id: "WEB_SHARE", label: t("share.methods.webShare"), enabled: true },
  {
    id: "WECHAT_CHAT",
    label: t("share.methods.wechat"),
  },
  {
    id: "XIAOHONGSHU",
    label: t("share.methods.xiaohongshu"),
  },
]);

const prId = computed(() => props.prId);
const shareData = computed(() => ({
  ...props.prData,
  xiaohongshuPoster: props.prData.xiaohongshuPoster ?? null,
  wechatThumbnail: props.prData.wechatThumbnail ?? null,
}));

const enabledMethods = computed(() =>
  allMethods.value.filter((m) => m.enabled || m.enabled === undefined),
);

const currentMethodId = ref<ShareMethodId>("XIAOHONGSHU");
const switchDirection = ref<"next" | "prev">("next");
const hasUserInteracted = ref(false);
const AUTO_ROTATE_INTERVAL_MS = 3000;

watchEffect(() => {
  const enabled = enabledMethods.value;
  if (enabled.length === 0) {
    currentMethodId.value = "WEB_SHARE";
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
    enabled[0] ?? {
      id: "WEB_SHARE",
      label: t("share.methods.webShare"),
      enabled: true,
    }
  );
});

const transitionName = computed(() =>
  switchDirection.value === "next"
    ? "method-switch-next"
    : "method-switch-prev",
);

const markUserInteraction = (): void => {
  hasUserInteracted.value = true;
};

const moveMethod = (offset: 1 | -1): void => {
  switchDirection.value = offset === 1 ? "next" : "prev";

  const enabled = enabledMethods.value;
  if (enabled.length <= 1) return;

  const currentIndex = Math.max(
    0,
    enabled.findIndex((m) => m.id === currentMethod.value.id),
  );
  const nextIndex = (currentIndex + offset + enabled.length) % enabled.length;
  currentMethodId.value = enabled[nextIndex].id;
};

const goToPrevMethod = (): void => {
  markUserInteraction();
  moveMethod(-1);
};

const goToNextMethod = (): void => {
  markUserInteraction();
  moveMethod(1);
};

const handleShareMethodInteraction = (): void => {
  markUserInteraction();
};

watchEffect((onCleanup) => {
  if (typeof window === "undefined") return;
  if (hasUserInteracted.value) return;
  if (enabledMethods.value.length <= 1) return;

  const timerId = window.setInterval(() => {
    if (hasUserInteracted.value) return;
    moveMethod(1);
  }, AUTO_ROTATE_INTERVAL_MS);

  onCleanup(() => {
    window.clearInterval(timerId);
  });
});
</script>

<style lang="scss" scoped>
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
  position: relative;
  height: 66vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.method-pane {
  width: 100%;
}

.method-switch-next-enter-active,
.method-switch-next-leave-active,
.method-switch-prev-enter-active,
.method-switch-prev-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.method-switch-next-enter-from,
.method-switch-next-leave-to {
  opacity: 0;
}

.method-switch-next-enter-from {
  transform: translateX(16px);
}

.method-switch-next-leave-to {
  transform: translateX(-16px);
}

.method-switch-prev-enter-from,
.method-switch-prev-leave-to {
  opacity: 0;
}

.method-switch-prev-enter-from {
  transform: translateX(-16px);
}

.method-switch-prev-leave-to {
  transform: translateX(16px);
}

.method-switch-next-leave-active,
.method-switch-prev-leave-active {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .method-switch-next-enter-active,
  .method-switch-next-leave-active,
  .method-switch-prev-enter-active,
  .method-switch-prev-leave-active {
    transition: none;
  }
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
