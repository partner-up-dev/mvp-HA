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

      <p class="nudge-title">{{ t("home.bookmarkNudge.title") }}</p>
      <p class="nudge-hint">
        {{
          environment === "wechat"
            ? t("home.bookmarkNudge.wechatHint")
            : t("home.bookmarkNudge.browserHint")
        }}
      </p>

      <div class="nudge-actions">
        <button
          class="nudge-action nudge-action--ghost"
          type="button"
          @click="handleBookmarkHint"
        >
          {{ t("home.bookmarkNudge.bookmarkAction") }}
        </button>
        <button
          class="nudge-action nudge-action--primary"
          type="button"
          @click="handleCopyLink"
        >
          {{
            copied
              ? t("home.bookmarkNudge.copiedAction")
              : t("home.bookmarkNudge.copyAction")
          }}
        </button>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { copyToClipboard } from "@/lib/clipboard";
import { useLandingBookmarkNudge } from "@/domains/landing/use-cases/useLandingBookmarkNudge";
import { trackEvent } from "@/shared/analytics/track";

const { t } = useI18n();
const { isVisible, triggerDepth, triggerMode, environment, hideForToday } =
  useLandingBookmarkNudge();
const copied = ref(false);
const hasTrackedShown = ref(false);

const trackAction = (action: "bookmark_hint" | "copy_link" | "dismiss") => {
  trackEvent("home_bookmark_action_click", {
    action,
    environment: environment.value,
  });
};

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

const handleCopyLink = async () => {
  if (typeof window === "undefined") return;
  try {
    await copyToClipboard(window.location.href);
    copied.value = true;
    trackAction("copy_link");
    window.setTimeout(() => {
      hideForToday();
    }, 400);
  } catch (error) {
    console.warn("Failed to copy home link", error);
    trackAction("copy_link");
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
  @include mx.pu-pill-action(outline-neutral, compact);
}

.nudge-action--primary {
  @include mx.pu-pill-action(solid-primary, compact);
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
