<template>
  <Transition name="nudge-fade">
    <aside
      v-if="isVisible"
      class="bookmark-nudge"
      role="status"
      aria-live="polite"
    >
      <button
        class="dismiss-btn"
        type="button"
        :aria-label="t('home.bookmarkNudge.dismissAction')"
        @click="handleDismiss"
      >
        <span class="i-mdi-close" aria-hidden="true"></span>
      </button>

      <p class="nudge-title">
        {{
          isWechatEnv
            ? t("home.bookmarkNudge.wechatTitle")
            : t("home.bookmarkNudge.title")
        }}
      </p>
      <p class="nudge-hint">
        {{
          isWechatEnv
            ? t("home.bookmarkNudge.wechatHint")
            : t("home.bookmarkNudge.browserHint")
        }}
      </p>

      <div class="nudge-actions">
        <button
          class="nudge-action nudge-action--ghost"
          type="button"
          :disabled="isWechatEnv && officialAccountQrCodeLoading"
          @click="handlePrimaryAction"
        >
          {{ primaryActionLabel }}
        </button>
        <button
          class="nudge-action nudge-action--primary"
          type="button"
          @click="handleCopyLink"
        >
          {{ secondaryActionLabel }}
        </button>
      </div>
    </aside>
  </Transition>

  <OfficialAccountQrModal
    :open="showOfficialAccountQrModal"
    @close="showOfficialAccountQrModal = false"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { copyToClipboard } from "@/lib/clipboard";
import { useLandingBookmarkNudge } from "@/domains/landing/use-cases/useLandingBookmarkNudge";
import { trackEvent } from "@/shared/telemetry/track";
import OfficialAccountQrModal from "@/shared/wechat/OfficialAccountQrModal.vue";
import { useWeChatOfficialAccountQrCode } from "@/shared/wechat/useWeChatOfficialAccountQrCode";

const { t } = useI18n();
const { isVisible, triggerDepth, triggerMode, environment, hideForToday } =
  useLandingBookmarkNudge();
const copied = ref(false);
const hasTrackedShown = ref(false);
const showOfficialAccountQrModal = ref(false);
const isWechatEnv = computed(() => environment.value === "wechat");
const { officialAccountQrCodeLoading } = useWeChatOfficialAccountQrCode();

type BookmarkNudgeAction =
  | "bookmark_hint"
  | "copy_link"
  | "copy_official_account"
  | "dismiss"
  | "follow_official_account";

const trackAction = (action: BookmarkNudgeAction) => {
  trackEvent("home_bookmark_action_click", {
    action,
    environment: environment.value,
  });
};

const primaryActionLabel = computed(() =>
  isWechatEnv.value
    ? t("home.bookmarkNudge.wechatAction")
    : t("home.bookmarkNudge.bookmarkAction"),
);

const secondaryActionLabel = computed(() => {
  if (copied.value) return t("home.bookmarkNudge.copiedAction");
  return isWechatEnv.value
    ? t("home.bookmarkNudge.wechatCopyAction")
    : t("home.bookmarkNudge.copyAction");
});

const copyTarget = computed(() => {
  if (isWechatEnv.value) return t("home.bookmarkNudge.officialAccountName");
  if (typeof window === "undefined") return "";
  return window.location.href;
});

const copyActionName = computed<BookmarkNudgeAction>(() =>
  isWechatEnv.value ? "copy_official_account" : "copy_link",
);

watch(isVisible, (visible) => {
  if (!visible || hasTrackedShown.value) return;
  hasTrackedShown.value = true;
  trackEvent("home_bookmark_nudge_shown", {
    triggerDepthPercent: triggerDepth.value,
    triggerMode: triggerMode.value,
    environment: environment.value,
  });
});

const handleBookmarkHint = () => {
  trackAction("bookmark_hint");
  hideForToday();
};

const handleFollowOfficialAccount = () => {
  if (!isWechatEnv.value) {
    handleBookmarkHint();
    return;
  }

  trackAction("follow_official_account");
  showOfficialAccountQrModal.value = true;
  hideForToday();
};

const handlePrimaryAction = () => {
  if (isWechatEnv.value) {
    handleFollowOfficialAccount();
    return;
  }
  handleBookmarkHint();
};

const handleCopyLink = async () => {
  if (typeof window === "undefined") return;
  try {
    const target = copyTarget.value;
    if (!target) {
      trackAction(copyActionName.value);
      hideForToday();
      return;
    }
    await copyToClipboard(target);
    copied.value = true;
    trackAction(copyActionName.value);
    window.setTimeout(() => {
      hideForToday();
    }, 400);
  } catch (error) {
    console.warn("Failed to copy home link", error);
    trackAction(copyActionName.value);
  }
};

const handleDismiss = () => {
  trackAction("dismiss");
  hideForToday();
};
</script>

<style lang="scss" scoped>
.bookmark-nudge {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--sys-spacing-med) + var(--pu-safe-bottom));
  width: min(100% - (var(--sys-spacing-med) * 2), 24rem);
  background: color-mix(
    in srgb,
    var(--sys-color-surface-container-low) 92%,
    transparent
  );
  border: 1px solid
    color-mix(in srgb, var(--sys-color-outline) 54%, transparent);
  border-radius: var(--sys-radius-med);
  padding: var(--sys-spacing-med);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  backdrop-filter: blur(12px);
  @include mx.pu-elevation(4);
}

.dismiss-btn {
  border: none;
  background: transparent;
  color: var(--sys-color-on-surface-variant);
  width: fit-content;
  margin-left: auto;
  cursor: pointer;

  .i-mdi-close {
    @include mx.pu-icon(medium, true);
  }
}

.nudge-title {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface);
  margin: 0;
}

.nudge-hint {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
}

.nudge-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs);
  margin-top: var(--sys-spacing-xs);
}

.nudge-action {
  @include mx.pu-font(label-large);
  cursor: pointer;
}

.nudge-action--ghost {
  @include mx.pu-pill-action(outline-transparent);
  border-color: var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-low);
  min-height: auto;
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
}

.nudge-action--primary {
  @include mx.pu-pill-action(solid-primary);
  min-height: auto;
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
}

.nudge-fade-enter-active,
.nudge-fade-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.nudge-fade-enter-from,
.nudge-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.5rem);
}

@media (max-width: 768px) {
  .nudge-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .nudge-action--ghost,
  .nudge-action--primary {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nudge-fade-enter-active,
  .nudge-fade-leave-active {
    transition: none !important;
  }
}
</style>
