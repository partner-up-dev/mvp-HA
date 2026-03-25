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
            ? t("home.bookmarkNudge.wechatHint", {
                name: t("home.bookmarkNudge.officialAccountName"),
              })
            : t("home.bookmarkNudge.browserHint")
        }}
      </p>

      <div class="nudge-actions">
        <button
          class="nudge-action nudge-action--ghost"
          type="button"
          :disabled="isWechatEnv && followLoading"
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
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { copyToClipboard } from "@/lib/clipboard";
import { useLandingBookmarkNudge } from "@/domains/landing/use-cases/useLandingBookmarkNudge";
import { trackEvent } from "@/shared/analytics/track";
import { useWeChatOfficialAccountFollow } from "@/shared/wechat/useWeChatOfficialAccountFollow";

const { t } = useI18n();
const { isVisible, triggerDepth, triggerMode, environment, hideForToday } =
  useLandingBookmarkNudge();
const copied = ref(false);
const hasTrackedShown = ref(false);
const followLoading = ref(false);
const {
  followOfficialAccount,
  followSchemeUrl,
  isConfigured: officialAccountConfigured,
} = useWeChatOfficialAccountFollow();
const isWechatEnv = computed(() => environment.value === "wechat");

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

const handleFollowOfficialAccount = async () => {
  if (!isWechatEnv.value) {
    handleBookmarkHint();
    return;
  }

  trackAction("follow_official_account");

  if (!officialAccountConfigured.value) {
    hideForToday();
    return;
  }

  try {
    followLoading.value = true;
    await followOfficialAccount();
    hideForToday();
  } catch (error) {
    console.warn("Failed to open official account profile", error);
    if (typeof window !== "undefined" && followSchemeUrl) {
      window.location.href = followSchemeUrl;
    }
    hideForToday();
  } finally {
    followLoading.value = false;
  }
};

const handlePrimaryAction = async () => {
  if (isWechatEnv.value) {
    await handleFollowOfficialAccount();
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
  width: min(
    100% - (var(--sys-spacing-med) * 2),
    var(--dcs-layout-bookmark-nudge-max-width)
  );
  background: var(--sys-color-surface-container-low);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-med);
  padding: var(--sys-spacing-med);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
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
  @include mx.pu-font(title-small);
  color: var(--sys-color-on-surface);
}

.nudge-hint {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.nudge-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
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
</style>
