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

    <div class="content-section">
      <ShareAsLink
        v-show="currentMethod.id === 'COPY_LINK'"
        :share-url="shareUrl"
      />

      <ShareToWechatChatMethod
        v-show="currentMethod.id === 'WECHAT_CHAT'"
        :share-url="shareUrl"
        :pr-id="prId!"
        :raw-text="prData.rawText"
        :pr-data="shareData"
      />

      <ShareToXiaohongshuMethod
        v-show="currentMethod.id === 'XIAOHONGSHU'"
        :share-url="shareUrl"
        :pr-id="prId!"
        :pr-data="shareData"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import ShareAsLink from "./ShareAsLink/ShareAsLink.vue";
import ShareToXiaohongshuMethod from "./ShareToXiaohongshu/ShareToXiaohongshu.vue";
import ShareToWechatChatMethod from "./ShareToWechat/ShareToWechat.vue";
import type { PartnerRequestFields, PRId } from "@partner-up-dev/backend";

type ShareMethodId = "COPY_LINK" | "XIAOHONGSHU" | "WECHAT_CHAT";

interface ShareMethod {
  id: ShareMethodId;
  label: string;
  enabled?: boolean;
}

interface Props {
  shareUrl: string;
  prId: PRId;
  prData: {
    title?: string;
    type: string;
    time: PartnerRequestFields["time"];
    location: string | null;
    partners: PartnerRequestFields["partners"];
    budget: string | null;
    preferences: string[];
    notes: string | null;
    rawText: string;
    xiaohongshuPoster?: {
      caption: string;
      posterStylePrompt: string;
      posterUrl: string;
      createdAt: string;
    } | null;
    wechatThumbnail?: {
      style: number;
      posterUrl: string;
      createdAt: string;
    } | null;
  };
}

const props = defineProps<Props>();
const { t } = useI18n();

const allMethods = computed<ShareMethod[]>(() => [
  { id: "COPY_LINK", label: t("share.methods.copyLink"), enabled: true },
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
  title: props.prData.title,
  type: props.prData.type,
  time: props.prData.time,
  location: props.prData.location,
  partners: props.prData.partners,
  budget: props.prData.budget,
  preferences: props.prData.preferences,
  notes: props.prData.notes,
  xiaohongshuPoster: props.prData.xiaohongshuPoster ?? null,
  wechatThumbnail: props.prData.wechatThumbnail ?? null,
}));

const enabledMethods = computed(() =>
  allMethods.value.filter((m) => m.enabled || m.enabled === undefined),
);

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
    enabled[0] ?? {
      id: "COPY_LINK",
      label: t("share.methods.copyLink"),
      enabled: true,
    }
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
