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

      <Button
        v-if="canToggleReminder"
        type="button"
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
      </Button>

      <Button
        v-else-if="isWeChatEnv && reminderConfigured && !reminderAuthenticated"
        tone="surface"
        type="button"
        @click="emit('go-wechat-login')"
      >
        {{ t("prPage.wechatReminder.loginAction") }}
      </Button>
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
        <Button
          type="button"
          :disabled="checkInPending"
          @click="emit('submit-check-in', true)"
        >
          {{ t("prPage.wouldJoinAgainYes") }}
        </Button>
        <Button
          tone="secondary"
          type="button"
          :disabled="checkInPending"
          @click="emit('submit-check-in', false)"
        >
          {{ t("prPage.wouldJoinAgainNo") }}
        </Button>
        <Button
          tone="surface"
          type="button"
          :disabled="checkInPending"
          @click="emit('cancel-check-in')"
        >
          {{ t("common.cancel") }}
        </Button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorPRDetailView } from "@/domains/pr/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type AnchorPartnerSection = AnchorPRDetailView["partnerSection"];

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
  padding: var(--sys-spacing-med);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface-container);
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
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: transparent;
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
  padding: var(--sys-spacing-sm);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container-high);
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
