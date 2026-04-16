<template>
  <Transition name="nudge-fade">
    <aside
      v-if="isVisible"
      v-bind="attrs"
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
      <p class="nudge-hint">{{ t("home.bookmarkNudge.hint") }}</p>

      <div class="nudge-actions">
        <button
          class="nudge-action nudge-action--ghost"
          type="button"
          @click="handleOpenWebQr"
        >
          {{ t("home.bookmarkNudge.webQrAction") }}
        </button>
        <button
          class="nudge-action nudge-action--primary"
          type="button"
          @click="handleOpenOfficialAccountQr"
        >
          {{ t("home.bookmarkNudge.officialAccountQrAction") }}
        </button>
      </div>
    </aside>
  </Transition>

  <LandingWebPageQrModal
    :open="showWebPageQrModal"
    @close="showWebPageQrModal = false"
  />
  <OfficialAccountQrModal
    :open="showOfficialAccountQrModal"
    @close="showOfficialAccountQrModal = false"
  />
</template>

<script setup lang="ts">
import { ref, useAttrs, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useLandingBookmarkNudge } from "@/domains/landing/use-cases/useLandingBookmarkNudge";
import { trackEvent } from "@/shared/telemetry/track";
import OfficialAccountQrModal from "@/shared/wechat/OfficialAccountQrModal.vue";
import LandingWebPageQrModal from "@/domains/landing/ui/sections/LandingWebPageQrModal.vue";

defineOptions({
  inheritAttrs: false,
});

const { t } = useI18n();
const attrs = useAttrs();
const { isVisible, triggerDepth, triggerMode, environment, hideForToday } =
  useLandingBookmarkNudge();
const hasTrackedShown = ref(false);
const showWebPageQrModal = ref(false);
const showOfficialAccountQrModal = ref(false);

type BookmarkNudgeAction =
  | "open_web_page_qr"
  | "open_official_account_qr"
  | "dismiss";

const trackAction = (action: BookmarkNudgeAction) => {
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

const handleOpenWebQr = () => {
  trackAction("open_web_page_qr");
  showWebPageQrModal.value = true;
  hideForToday();
};

const handleOpenOfficialAccountQr = () => {
  trackAction("open_official_account_qr");
  showOfficialAccountQrModal.value = true;
  hideForToday();
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
  background: var(--sys-color-surface-container-low);
  border: 1px solid var(--sys-color-outline-variant);
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
  @include mx.pu-font(body-large);
  color: var(--sys-color-on-surface);
  margin: 0;
}

.nudge-hint {
  @include mx.pu-font(label-large);
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
