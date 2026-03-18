<template>
  <section class="lane-card">
    <header class="lane-header">
      <h2 class="lane-title">{{ t("prPage.partnerSection.title") }}</h2>
      <p class="lane-slot-state">{{ slotStateText }}</p>
    </header>

    <p class="lane-subtitle">{{ t("prPage.partnerSection.subtitleAnchor") }}</p>

    <div class="lane-summary">
      <article class="lane-summary-card">
        <span class="lane-summary-label">{{
          t("prPage.partnerSection.summaryCurrent")
        }}</span>
        <strong class="lane-summary-value">{{ section.capacity.current }}</strong>
      </article>
      <article class="lane-summary-card">
        <span class="lane-summary-label">{{
          t("prPage.partnerSection.summaryMin")
        }}</span>
        <strong class="lane-summary-value">{{
          nullableNumberLabel(section.capacity.min)
        }}</strong>
      </article>
      <article class="lane-summary-card">
        <span class="lane-summary-label">{{
          t("prPage.partnerSection.summaryMax")
        }}</span>
        <strong class="lane-summary-value">{{
          nullableNumberLabel(section.capacity.max)
        }}</strong>
      </article>
      <article class="lane-summary-card">
        <span class="lane-summary-label">{{
          t("prPage.partnerSection.summaryState")
        }}</span>
        <strong class="lane-summary-value">{{ readinessText }}</strong>
      </article>
    </div>

    <p v-if="availabilityNote" class="lane-availability-note">
      {{ availabilityNote }}
    </p>

    <div class="lane-actions">
      <button
        v-if="primaryActionType !== 'NONE'"
        class="lane-primary-btn"
        :class="{
          'lane-primary-btn--danger': primaryActionType === 'EXIT',
        }"
        :disabled="primaryActionPending"
        @click="handlePrimaryAction"
      >
        {{ primaryActionLabel }}
      </button>

      <button
        v-if="showSecondaryExit"
        class="lane-secondary-btn lane-secondary-btn--danger"
        :disabled="exitPending"
        @click="emit('exit')"
      >
        {{ exitPending ? t("prPage.exiting") : t("prPage.exit") }}
      </button>

      <button
        v-if="showSecondaryCheckInMissed"
        class="lane-secondary-btn"
        :disabled="checkInPending"
        @click="emit('prepare-check-in', false)"
      >
        {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInMissed") }}
      </button>

      <button
        v-if="showRecoveryShortcut"
        class="lane-secondary-btn"
        @click="handleRecoveryShortcut"
      >
        {{ t("prPage.alternativeBatch.title") }}
      </button>
    </div>

    <p v-if="joinErrorMessage" class="lane-error-note">
      {{ joinErrorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";
import { trackEvent } from "@/shared/analytics/track";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type AnchorPartnerSection = AnchorPRDetailResponse["partnerSection"];
type BlockedReason = AnchorPartnerSection["viewer"]["joinBlockedReason"];
type PrimaryActionType = "JOIN" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT" | "NONE";
type PrimaryActionTrackType = Exclude<PrimaryActionType, "NONE">;
type ViewerState =
  | "CREATOR"
  | "PARTICIPANT"
  | "VISITOR_JOINABLE"
  | "VISITOR_BLOCKED";

const props = withDefaults(
  defineProps<{
    prId: number | null;
    section: AnchorPartnerSection;
    slotStateText: string;
    joinPending?: boolean;
    exitPending?: boolean;
    confirmPending?: boolean;
    checkInPending?: boolean;
    joinErrorMessage?: string | null;
  }>(),
  {
    joinPending: false,
    exitPending: false,
    confirmPending: false,
    checkInPending: false,
    joinErrorMessage: null,
  },
);

const emit = defineEmits<{
  join: [];
  exit: [];
  "confirm-slot": [];
  "prepare-check-in": [didAttend: boolean];
  "go-recovery": [];
}>();

const { t } = useI18n();
const lastPrimaryImpressionKey = ref("");

const readinessText = computed(() => {
  switch (props.section.capacity.readiness) {
    case "READY":
      return t("prPage.partnerSection.readinessReady");
    case "FULL":
      return t("prPage.partnerSection.readinessFull");
    case "ACTIVE":
      return t("prPage.partnerSection.readinessActive");
    case "UNAVAILABLE":
      return t("prPage.partnerSection.readinessUnavailable");
    default:
      return t("prPage.partnerSection.readinessNeedsMore", {
        count: props.section.capacity.neededToReady,
      });
  }
});

const primaryActionType = computed<PrimaryActionType>(() => {
  if (props.section.viewer.canCheckIn) return "CHECK_IN";
  if (props.section.viewer.canConfirm) return "CONFIRM_SLOT";
  if (props.section.viewer.canJoin) return "JOIN";
  if (props.section.viewer.isParticipant && props.section.viewer.canExit) {
    return "EXIT";
  }
  return "NONE";
});

const primaryActionLabel = computed(() => {
  switch (primaryActionType.value) {
    case "CHECK_IN":
      return props.checkInPending
        ? t("prPage.checkingIn")
        : t("prPage.checkInAttended");
    case "CONFIRM_SLOT":
      return props.confirmPending
        ? t("prPage.confirmingSlot")
        : t("prPage.confirmSlot");
    case "JOIN":
      return props.joinPending ? t("prPage.joining") : t("prPage.join");
    case "EXIT":
      return props.exitPending ? t("prPage.exiting") : t("prPage.exit");
    default:
      return "";
  }
});

const primaryActionPending = computed(() => {
  switch (primaryActionType.value) {
    case "CHECK_IN":
      return props.checkInPending;
    case "CONFIRM_SLOT":
      return props.confirmPending;
    case "JOIN":
      return props.joinPending;
    case "EXIT":
      return props.exitPending;
    default:
      return false;
  }
});

const showSecondaryExit = computed(
  () => props.section.viewer.canExit && primaryActionType.value !== "EXIT",
);

const showSecondaryCheckInMissed = computed(
  () =>
    props.section.viewer.canCheckIn && primaryActionType.value === "CHECK_IN",
);

const showRecoveryShortcut = computed(
  () =>
    primaryActionType.value === "NONE" &&
    (props.section.fallbacks.alternativeBatches.length > 0 ||
      props.section.fallbacks.sameBatchAlternatives.length > 0),
);

const viewerState = computed<ViewerState>(() => {
  if (props.section.viewer.isCreator) return "CREATOR";
  if (props.section.viewer.isParticipant) return "PARTICIPANT";
  return props.section.viewer.canJoin ? "VISITOR_JOINABLE" : "VISITOR_BLOCKED";
});

watch(
  () => [props.prId, primaryActionType.value, viewerState.value] as const,
  ([prId, ctaType, currentViewerState]) => {
    if (prId === null || ctaType === "NONE") return;

    const impressionKey = `${prId}:${ctaType}:${currentViewerState}`;
    if (lastPrimaryImpressionKey.value === impressionKey) return;
    lastPrimaryImpressionKey.value = impressionKey;

    trackEvent("anchor_pr_primary_cta_impression", {
      prId,
      prKind: "ANCHOR",
      ctaType,
      viewerState: currentViewerState,
    });
  },
  { immediate: true },
);

const availabilityNote = computed(() => {
  if (props.section.viewer.isCreator) {
    return t("prPage.partnerSection.creatorHint");
  }

  if (props.section.viewer.isParticipant) {
    if (!props.section.viewer.canExit) {
      return blockedReasonText(props.section.viewer.exitBlockedReason);
    }
    if (!props.section.viewer.canConfirm) {
      return blockedReasonText(props.section.viewer.confirmBlockedReason);
    }
    return t("prPage.partnerSection.joinedHint");
  }

  if (props.section.viewer.canJoin) {
    return t("prPage.partnerSection.openHint");
  }

  return blockedReasonText(props.section.viewer.joinBlockedReason);
});

const nullableNumberLabel = (value: number | null): string =>
  value === null ? t("prPage.partnerSection.unlimited") : String(value);

const confirmWindowText = computed(() => {
  const notSet = t("prPage.partnerSection.notSet");
  return {
    confirmStart:
      formatLocalDateTimeValue(props.section.timeline?.confirmationStartAt) ??
      notSet,
    confirmEnd:
      formatLocalDateTimeValue(props.section.timeline?.confirmationEndAt) ??
      notSet,
  };
});

const handlePrimaryAction = () => {
  if (props.prId !== null && primaryActionType.value !== "NONE") {
    trackEvent("anchor_pr_primary_cta_click", {
      prId: props.prId,
      prKind: "ANCHOR",
      ctaType: primaryActionType.value as PrimaryActionTrackType,
      viewerState: viewerState.value,
    });
  }

  switch (primaryActionType.value) {
    case "CHECK_IN":
      emit("prepare-check-in", true);
      return;
    case "CONFIRM_SLOT":
      emit("confirm-slot");
      return;
    case "JOIN":
      emit("join");
      return;
    case "EXIT":
      emit("exit");
      return;
    default:
      return;
  }
};

const handleRecoveryShortcut = () => {
  if (props.prId !== null) {
    trackEvent("anchor_pr_lane_expand", {
      prId: props.prId,
      prKind: "ANCHOR",
      laneId: "RECOVERY",
      entry: "PRIMARY_SHORTCUT",
    });
  }
  emit("go-recovery");
};

function blockedReasonText(reason: BlockedReason): string {
  switch (reason) {
    case "FULL":
      return t("prPage.partnerSection.blockedFull");
    case "JOIN_LOCKED":
      return t("prPage.partnerSection.blockedJoinLocked");
    case "EVENT_STARTED":
      return t("prPage.partnerSection.blockedEventStarted");
    case "BOOKING_LOCKED":
      return t("prPage.partnerSection.blockedBookingLocked");
    case "OUTSIDE_CONFIRM_WINDOW":
      return t(
        "prPage.partnerSection.blockedConfirmWindow",
        confirmWindowText.value,
      );
    case "ALREADY_CONFIRMED":
      return t("prPage.partnerSection.blockedAlreadyConfirmed");
    case "ALREADY_JOINED":
      return t("prPage.partnerSection.joinedHint");
    case "NOT_JOINED":
      return t("prPage.partnerSection.blockedNotJoined");
    case "NOT_JOINABLE_STATUS":
      return t("prPage.partnerSection.blockedStatus");
    case "CHECKIN_NOT_OPEN":
      return t("prPage.partnerSection.blockedCheckIn");
    default:
      return "";
  }
}
</script>

<style lang="scss" scoped>
.lane-card {
  margin-top: var(--sys-spacing-lg);
  @include mx.pu-surface-card(section);
  border-top: 3px solid var(--sys-color-primary);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.lane-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sys-spacing-sm);
}

.lane-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.lane-subtitle,
.lane-availability-note {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.lane-error-note {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-error);
}

.lane-slot-state {
  margin: 0;
  @include mx.pu-pill-badge(primary);
  border-radius: 999px;
}

.lane-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-sm);
}

.lane-summary-card {
  @include mx.pu-surface-card(inset-high);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.lane-summary-label {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.lane-summary-value {
  @include mx.pu-font(body-large);
}

.lane-availability-note {
  @include mx.pu-surface-card(inset-high);
  border-inline-start: 3px solid var(--sys-color-primary);
  padding: var(--sys-spacing-sm);
}

.lane-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.lane-primary-btn,
.lane-secondary-btn {
  @include mx.pu-font(label-large);
  border: none;
  cursor: pointer;
}

.lane-primary-btn {
  @include mx.pu-rect-action(primary, default);
}

.lane-primary-btn--danger {
  @include mx.pu-rect-action(danger, default);
}

.lane-secondary-btn {
  @include mx.pu-rect-action(outline-primary, default);
}

.lane-secondary-btn--danger {
  @include mx.pu-rect-action(outline, default);
}

@media (min-width: 880px) {
  .lane-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .lane-actions > button {
    flex: 1 1 220px;
  }
}
</style>
