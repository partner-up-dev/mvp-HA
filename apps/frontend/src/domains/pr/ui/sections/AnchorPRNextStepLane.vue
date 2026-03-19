<template>
  <section v-if="hasContent" class="lane-card">
    <header class="lane-header">
      <h2 class="lane-title">{{ t("prPage.partnerSection.timelineTitle") }}</h2>
    </header>

    <div v-if="section.timeline" class="timeline-list">
      <div class="timeline-item">
        <span class="timeline-label">{{
          t("prPage.partnerSection.timelineEventStart")
        }}</span>
        <span class="timeline-value">{{
          formatDateTime(section.timeline.eventStartAt)
        }}</span>
      </div>
      <div class="timeline-item">
        <span class="timeline-label">{{
          t("prPage.partnerSection.timelineConfirmationWindow")
        }}</span>
        <span class="timeline-value">
          {{
            formatWindow(
              section.timeline.confirmationStartAt,
              section.timeline.confirmationEndAt,
            )
          }}
        </span>
      </div>
      <div class="timeline-item">
        <span class="timeline-label">{{
          t("prPage.partnerSection.timelineJoinLock")
        }}</span>
        <span class="timeline-value">{{
          formatDateTime(section.timeline.joinLockAt)
        }}</span>
      </div>
      <div class="timeline-item">
        <span class="timeline-label">{{
          t("prPage.partnerSection.timelineBookingDeadline")
        }}</span>
        <span class="timeline-value">{{
          formatDateTime(section.timeline.bookingDeadlineAt)
        }}</span>
      </div>
      <div v-if="section.timeline.bookingTriggeredAt" class="timeline-item">
        <span class="timeline-label">{{
          t("prPage.partnerSection.timelineBookingTriggered")
        }}</span>
        <span class="timeline-value">{{
          formatDateTime(section.timeline.bookingTriggeredAt)
        }}</span>
      </div>
    </div>

    <section
      v-if="section.reminder.supported && section.reminder.visible"
      class="sub-panel"
    >
      <h3 class="sub-panel-title">{{ t("prPage.wechatReminder.title") }}</h3>
      <p class="sub-panel-note">{{ reminderHintText }}</p>

      <button
        v-if="canToggleReminder"
        class="primary-btn"
        :disabled="reminderTogglePending"
        @click="emit('toggle-reminder')"
      >
        {{
          reminderTogglePending
            ? t("prPage.wechatReminder.updating")
            : reminderEnabled
              ? t("prPage.wechatReminder.disableAction")
              : t("prPage.wechatReminder.enableAction")
        }}
      </button>

      <button
        v-else-if="isWeChatEnv && reminderConfigured && !reminderAuthenticated"
        class="ghost-btn"
        @click="emit('go-wechat-login')"
      >
        {{ t("prPage.wechatReminder.loginAction") }}
      </button>
    </section>

    <section v-if="showCheckInFollowup" class="sub-panel">
      <p class="sub-panel-note">
        {{
          t("prPage.checkInFollowupQuestion", {
            status: checkInFollowupStatusLabel,
          })
        }}
      </p>
      <div class="followup-actions">
        <button
          class="primary-btn"
          :disabled="checkInPending"
          @click="emit('submit-check-in', true)"
        >
          {{ t("prPage.wouldJoinAgainYes") }}
        </button>
        <button
          class="secondary-btn"
          :disabled="checkInPending"
          @click="emit('submit-check-in', false)"
        >
          {{ t("prPage.wouldJoinAgainNo") }}
        </button>
        <button
          class="ghost-btn"
          :disabled="checkInPending"
          @click="emit('cancel-check-in')"
        >
          {{ t("common.cancel") }}
        </button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type AnchorPartnerSection = AnchorPRDetailResponse["partnerSection"];

const props = withDefaults(
  defineProps<{
    section: AnchorPartnerSection;
    showCheckInFollowup?: boolean;
    checkInFollowupStatusLabel?: string;
    checkInPending?: boolean;
    canToggleReminder?: boolean;
    reminderEnabled?: boolean;
    reminderTogglePending?: boolean;
    reminderAuthenticated?: boolean;
    reminderConfigured?: boolean;
    reminderHintText?: string;
    isWeChatEnv?: boolean;
  }>(),
  {
    showCheckInFollowup: false,
    checkInFollowupStatusLabel: "",
    checkInPending: false,
    canToggleReminder: false,
    reminderEnabled: false,
    reminderTogglePending: false,
    reminderAuthenticated: false,
    reminderConfigured: false,
    reminderHintText: "",
    isWeChatEnv: false,
  },
);

const emit = defineEmits<{
  "submit-check-in": [wouldJoinAgain: boolean];
  "cancel-check-in": [];
  "toggle-reminder": [];
  "go-wechat-login": [];
}>();

const { t } = useI18n();

const hasContent = computed(
  () =>
    Boolean(props.section.timeline) ||
    (props.section.reminder.supported && props.section.reminder.visible) ||
    props.showCheckInFollowup,
);

const formatDateTime = (value: string | null): string =>
  formatLocalDateTimeValue(value) ?? t("prPage.partnerSection.notSet");

const formatWindow = (start: string | null, end: string | null): string => {
  const startLabel = formatLocalDateTimeValue(start);
  const endLabel = formatLocalDateTimeValue(end);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel ?? endLabel ?? t("prPage.partnerSection.notSet");
};
</script>

<style lang="scss" scoped>
.lane-card {
  margin-top: var(--sys-spacing-lg);
  @include mx.pu-surface-card(section);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.lane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lane-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.timeline-item {
  @include mx.pu-surface-card(outline);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.timeline-label {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.timeline-value {
  @include mx.pu-font(body-large);
}

.sub-panel {
  @include mx.pu-surface-card(inset-high);
  border: 1px solid var(--sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.sub-panel-title {
  margin: 0;
  @include mx.pu-font(title-small);
}

.sub-panel-note {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.followup-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.primary-btn,
.secondary-btn,
.ghost-btn {
  @include mx.pu-font(label-large);
  border: none;
  cursor: pointer;
}

.primary-btn {
  @include mx.pu-rect-action(primary, default);
}

.secondary-btn {
  @include mx.pu-rect-action(outline-primary, default);
}

.ghost-btn {
  @include mx.pu-rect-action(surface, default);
}

@media (min-width: 880px) {
  .timeline-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .followup-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .followup-actions > button {
    flex: 1 1 220px;
  }
}
</style>
