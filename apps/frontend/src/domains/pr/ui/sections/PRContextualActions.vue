<template>
  <section
    v-if="showContextualActionArea"
    class="contextual-area"
    data-region="actions"
    data-testid="pr-detail.actions"
  >
    <InlineNotice
      v-if="releaseNoticeText"
      tone="warning"
      :message="releaseNoticeText"
    />

    <InlineNotice
      v-if="primaryBlockedMessage"
      tone="warning"
      :message="primaryBlockedMessage"
    />

    <InlineNotice
      v-if="waitlistNoticeText"
      tone="info"
      :message="waitlistNoticeText"
      data-testid="pr-detail.waitlist.notice"
    />

    <div v-if="showCancelWaitlistActionInContext" class="secondary-action">
      <Button
        tone="surface"
        :loading="cancelWaitlistMutation.isPending.value"
        block
        @click="requestCancelWaitlistWithConfirm"
      >
        {{
          cancelWaitlistMutation.isPending.value
            ? t("prPage.cancelWaitlisting")
            : t("prPage.cancelWaitlist")
        }}
      </Button>
      <p v-if="cancelWaitlistActionError" class="action-error">
        {{ cancelWaitlistActionError }}
      </p>
    </div>

    <PRJoinFlow
      ref="joinFlowRef"
      :pr-id="prId"
      :disabled="
        joinDockAction?.key !== 'JOIN' || (joinDockAction?.disabled ?? true)
      "
      :scenario-type="pr.core.type"
      :event-id="routeEventId"
      :entry-surface="joinEntrySurface"
      :confirmation-deadline-at="confirmationDeadlineAt"
      :viewer-is-participant="pr.partnerSection.viewer.isParticipant"
      write-join-entry-on-auth
      @joined="handleJoinFlowJoined"
    >
      <template #default="{ open, pending, disabled, joined, errorMessage }">
        <div v-if="joinDockAction?.key === 'JOIN'" class="primary-action">
          <Button
            class="primary-action__button"
            :tone="buttonToneForAction(joinDockAction)"
            :disabled="disabled"
            :loading="pending"
            block
            data-testid="pr-detail.join.open"
            @click="handleDockJoinAction(joinDockAction, open)"
          >
            {{
              joined
                ? t("prPage.partnerSection.rosterJoined")
                : pending
                  ? joinDockAction.pendingLabel
                  : joinDockAction.label
            }}
          </Button>
          <p v-if="errorMessage" class="action-error">
            {{ errorMessage }}
          </p>
          <p v-if="joinDockAction.tip" class="action-tip">
            {{ joinDockAction.tip }}
          </p>
        </div>
      </template>
    </PRJoinFlow>

    <PRWaitlistFlow
      ref="waitlistFlowRef"
      :pr-id="prId"
      :disabled="
        joinDockAction?.key !== 'WAITLIST' ||
        (joinDockAction?.disabled ?? true)
      "
      :scenario-type="pr.core.type"
      :event-id="routeEventId"
      :entry-surface="joinEntrySurface"
      :confirmation-deadline-at="confirmationDeadlineAt"
      :viewer-is-participant="pr.partnerSection.viewer.isParticipant"
      write-join-entry-on-auth
      @joined="handleJoinFlowJoined"
    >
      <template #default="{ open, pending, disabled, joined, errorMessage }">
        <div v-if="joinDockAction?.key === 'WAITLIST'" class="primary-action">
          <Button
            class="primary-action__button"
            :tone="buttonToneForAction(joinDockAction)"
            :disabled="disabled"
            :loading="pending"
            block
            data-testid="pr-detail.waitlist.open"
            @click="handleDockJoinAction(joinDockAction, open)"
          >
            {{
              joined
                ? t("prPage.waitlisted")
                : pending
                  ? joinDockAction.pendingLabel
                  : joinDockAction.label
            }}
          </Button>
          <p v-if="errorMessage" class="action-error">
            {{ errorMessage }}
          </p>
          <p v-if="joinDockAction.tip" class="action-tip">
            {{ joinDockAction.tip }}
          </p>
        </div>
      </template>
    </PRWaitlistFlow>

    <div v-if="nonJoinPrimaryDockAction" class="primary-action">
      <Button
        class="primary-action__button"
        :tone="buttonToneForAction(nonJoinPrimaryDockAction)"
        :disabled="nonJoinPrimaryDockAction.disabled"
        :loading="nonJoinPrimaryDockAction.pending"
        block
        :data-testid="primaryActionTestId(nonJoinPrimaryDockAction)"
        @click="handleDockAction(nonJoinPrimaryDockAction)"
      >
        {{
          nonJoinPrimaryDockAction.pending
            ? nonJoinPrimaryDockAction.pendingLabel
            : nonJoinPrimaryDockAction.label
        }}
      </Button>
      <p v-if="nonJoinPrimaryDockAction.tip" class="action-tip">
        {{ nonJoinPrimaryDockAction.tip }}
      </p>
    </div>

    <div v-if="showFeedbackRetryAction" class="primary-action">
      <Button
        class="primary-action__button"
        tone="primary-outline"
        block
        data-testid="pr-detail.feedback.open"
        @click="openFeedbackQuestionnaire"
      >
        {{ t("prPage.feedbackQuestionnaire.openAction") }}
      </Button>
    </div>

    <div v-if="showExitActionInContext" class="secondary-danger-action">
      <Button
        tone="danger"
        :disabled="!sharedActions.canExit.value"
        :loading="sharedActions.exitPending.value"
        block
        @click="requestExitWithConfirm"
      >
        {{ t("prPage.exit") }}
      </Button>
      <p v-if="exitBlockedTip" class="action-tip">
        {{ exitBlockedTip }}
      </p>
      <p v-if="exitActionError" class="action-error">
        {{ exitActionError }}
      </p>
    </div>

    <p v-if="primaryActionErrorMessage" class="action-error page-action-error">
      {{ primaryActionErrorMessage }}
    </p>

    <ConfirmDialog
      :open="showExitConfirmModal"
      title="确认退出"
      message="退出后你的参与名额会被释放，确认继续？"
      :confirm-label="
        sharedActions.exitPending.value ? t('prPage.exiting') : t('common.confirm')
      "
      confirm-tone="danger"
      :loading="sharedActions.exitPending.value"
      @close="showExitConfirmModal = false"
      @confirm="confirmExit"
    />

    <ConfirmDialog
      :open="showCancelWaitlistConfirmModal"
      :title="t('prPage.cancelWaitlistConfirm.title')"
      :message="t('prPage.cancelWaitlistConfirm.message')"
      :confirm-label="
        cancelWaitlistMutation.isPending.value
          ? t('prPage.cancelWaitlisting')
          : t('prPage.cancelWaitlist')
      "
      confirm-tone="danger"
      :loading="cancelWaitlistMutation.isPending.value"
      @close="showCancelWaitlistConfirmModal = false"
      @confirm="confirmCancelWaitlist"
    />

    <Modal
      :open="attendanceActions.showCheckInFollowup.value"
      :title="
        t('prPage.checkInFollowupQuestion', {
          status: attendanceActions.checkInFollowupStatusLabel.value,
        })
      "
      @close="attendanceActions.cancelPendingCheckIn"
    >
      <div class="modal-actions modal-actions--stack">
        <Button
          type="button"
          :disabled="attendanceActions.checkInPending.value"
          @click="submitCheckInThenFeedback(true)"
        >
          {{ t("prPage.wouldJoinAgainYes") }}
        </Button>
        <Button
          tone="primary-outline"
          type="button"
          :disabled="attendanceActions.checkInPending.value"
          @click="submitCheckInThenFeedback(false)"
        >
          {{ t("prPage.wouldJoinAgainNo") }}
        </Button>
        <Button
          tone="surface"
          type="button"
          :disabled="attendanceActions.checkInPending.value"
          @click="attendanceActions.cancelPendingCheckIn"
        >
          {{ t("common.cancel") }}
        </Button>
      </div>
    </Modal>

    <PRFeedbackQuestionnaireModal
      :open="feedbackModalOpen"
      :questionnaire="feedbackQuestionnaire"
      :pending="submitFeedbackMutation.isPending.value"
      @close="feedbackModalOpen = false"
      @submit="submitFeedbackQuestionnaire"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { FeedbackQuestionnaireAnswers, PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import ConfirmDialog from "@/shared/ui/overlay/ConfirmDialog.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import PRJoinFlow from "@/domains/pr/ui/composites/PRJoinFlow.vue";
import PRWaitlistFlow from "@/domains/pr/ui/composites/PRWaitlistFlow.vue";
import { useSharedPRActions } from "@/domains/pr/use-cases/useSharedPRActions";
import { usePRAttendanceActions } from "@/domains/pr/use-cases/usePRAttendanceActions";
import { useCancelWaitlistPR } from "@/domains/pr/queries/usePRActions";
import { useSubmitFeedbackQuestionnaire } from "@/domains/feedback/queries/useSubmitFeedbackQuestionnaire";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import { trackEvent } from "@/shared/telemetry/track";
import PRFeedbackQuestionnaireModal from "./PRFeedbackQuestionnaireModal.vue";

type ContextualReplayKind = "PR_JOIN" | "PR_WAITLIST" | "PR_EXIT" | "PR_CONFIRM";
type DockActionKey = "JOIN" | "WAITLIST" | "CONFIRM" | "CHECKIN_ATTENDED";
type DockActionItem = {
  key: DockActionKey;
  label: string;
  pendingLabel: string;
  tone: "primary" | "primary-outline" | "secondary" | "surface" | "danger";
  disabled: boolean;
  pending: boolean;
  tip: string | null;
};
type ViewerState =
  | "CREATOR"
  | "PARTICIPANT"
  | "VISITOR_JOINABLE"
  | "VISITOR_WAITLISTABLE"
  | "VISITOR_WAITLISTED"
  | "VISITOR_BLOCKED";
type Viewer = PRDetailView["partnerSection"]["viewer"];
type BlockedReason =
  | Viewer["joinBlockedReason"]
  | Viewer["waitlistBlockedReason"]
  | Viewer["confirmBlockedReason"]
  | Viewer["checkInBlockedReason"]
  | Viewer["exitBlockedReason"];

const props = defineProps<{
  prId: PRId | null;
  pr: PRDetailView;
  routeEventId: number | null;
  joinEntrySurface: "form_mode_matched" | "pr_detail";
  confirmationDeadlineAt: string | null;
  supportsEventContextFeatures: boolean;
}>();

const emit = defineEmits<{
  "action-success": [];
}>();

const { t } = useI18n();
const prDetail = computed(() => props.pr);
const id = computed(() => props.prId);
const showExitConfirmModal = ref(false);
const showCancelWaitlistConfirmModal = ref(false);
const bookingContactActionError = ref<string | null>(null);
const exitActionError = ref<string | null>(null);
const cancelWaitlistActionError = ref<string | null>(null);
const feedbackModalOpen = ref(false);
const lastPrimaryImpressionKey = ref("");
const joinFlowRef = ref<{ open: () => Promise<void> } | null>(null);
const waitlistFlowRef = ref<{ open: () => Promise<void> } | null>(null);
const cancelWaitlistMutation = useCancelWaitlistPR();
const submitFeedbackMutation = useSubmitFeedbackQuestionnaire();

const notifyActionSuccess = () => {
  emit("action-success");
};

const isCreator = computed(() => props.pr.partnerSection.viewer.isCreator);
const sharedActions = useSharedPRActions({
  id,
  pr: prDetail,
  isCreator,
  onActionSuccess: notifyActionSuccess,
});
const attendanceActions = usePRAttendanceActions({
  id,
  pr: prDetail,
  onActionSuccess: notifyActionSuccess,
});

const primaryActionErrorMessage = computed(
  () => bookingContactActionError.value,
);

const feedbackQuestionnaire = computed(() => props.pr.feedbackQuestionnaire);
const hasPendingFeedbackQuestionnaire = computed(
  () =>
    feedbackQuestionnaire.value?.responseState.status === "NOT_SUBMITTED",
);
const showFeedbackRetryAction = computed(
  () =>
    props.pr.partnerSection.viewer.slotState === "ATTENDED" &&
    hasPendingFeedbackQuestionnaire.value,
);

useBodyScrollLock(
  computed(
    () =>
      showExitConfirmModal.value ||
      showCancelWaitlistConfirmModal.value ||
      attendanceActions.showCheckInFollowup.value ||
      feedbackModalOpen.value,
  ),
);

const releaseNoticeText = computed(() => {
  const releasedSlot = props.pr.partnerSection.viewer.releasedSlot ?? null;
  if (!releasedSlot) return null;
  if (releasedSlot.state === "EXITED") {
    return t("prPage.partnerSection.releaseNoticeExit");
  }
  const manualReason = releasedSlot.releaseReason?.trim() ?? "";
  if (manualReason.length > 0) {
    return `你的名额已由管理员手动释放。原因：${manualReason}`;
  }
  return t("prPage.partnerSection.releaseNoticeAuto");
});

const viewerState = computed<ViewerState>(() => {
  const viewer = props.pr.partnerSection.viewer;
  if (viewer.isParticipant) return "PARTICIPANT";
  if (viewer.isCreator) return "CREATOR";
  if (viewer.isWaitlisted) return "VISITOR_WAITLISTED";
  if (viewer.canWaitlist) return "VISITOR_WAITLISTABLE";
  return viewer.canJoin ? "VISITOR_JOINABLE" : "VISITOR_BLOCKED";
});

const dockActions = computed<DockActionItem[]>(() => {
  const viewer = props.pr.partnerSection.viewer;
  if (viewer.isCreator && !viewer.isParticipant) {
    return [];
  }

  if (!viewer.isParticipant) {
    if (!viewer.canJoin && !viewer.canWaitlist) return [];
    if (viewer.canWaitlist) {
      return [
        {
          key: "WAITLIST",
          label: t("prPage.waitlist"),
          pendingLabel: t("prPage.waitlisting"),
          tone: "primary",
          disabled: !viewer.canWaitlist,
          pending: false,
          tip: viewer.canWaitlist
            ? null
            : blockedReasonText(viewer.waitlistBlockedReason),
        },
      ];
    }
    return [
      {
        key: "JOIN",
        label: t("prPage.join"),
        pendingLabel: t("prPage.joining"),
        tone: "primary",
        disabled: !viewer.canJoin,
        pending: false,
        tip: viewer.canJoin ? null : blockedReasonText(viewer.joinBlockedReason),
      },
    ];
  }

  if (viewer.slotState === "JOINED") {
    return [
      {
        key: "CONFIRM",
        label: t("prPage.confirmSlot"),
        pendingLabel: t("prPage.confirmingSlot"),
        tone: "primary",
        disabled: !viewer.canConfirm,
        pending: attendanceActions.confirmPending.value,
        tip: viewer.canConfirm ? null : resolveConfirmTip(),
      },
    ];
  }

  if (viewer.slotState === "CONFIRMED") {
    const checkInTip = viewer.canCheckIn ? null : resolveCheckInTip();
    return [
      {
        key: "CHECKIN_ATTENDED",
        label: t("prPage.checkInAttended"),
        pendingLabel: t("prPage.checkingIn"),
        tone: "primary",
        disabled: !viewer.canCheckIn,
        pending: attendanceActions.checkInPending.value,
        tip: checkInTip,
      },
    ];
  }

  return [];
});

const primaryDockAction = computed(() => dockActions.value[0] ?? null);
const joinDockAction = computed(() =>
  primaryDockAction.value?.key === "JOIN" ||
  primaryDockAction.value?.key === "WAITLIST"
    ? primaryDockAction.value
    : null,
);
const nonJoinPrimaryDockAction = computed(() =>
  primaryDockAction.value &&
  primaryDockAction.value.key !== "JOIN" &&
  primaryDockAction.value.key !== "WAITLIST"
    ? primaryDockAction.value
    : null,
);

const primaryBlockedMessage = computed(() => {
  const viewer = props.pr.partnerSection.viewer;
  if (
    viewer.isParticipant ||
    viewer.isWaitlisted ||
    viewer.canJoin ||
    viewer.canWaitlist
  ) {
    return null;
  }
  const reason =
    viewer.joinBlockedReason === "FULL"
      ? viewer.waitlistBlockedReason
      : viewer.joinBlockedReason;
  return blockedReasonText(reason);
});

const waitlistNoticeText = computed(() => {
  const viewer = props.pr.partnerSection.viewer;
  if (!viewer.isWaitlisted) return null;
  if (viewer.waitlistRank !== null) {
    return t("prPage.waitlistRankNotice", { rank: viewer.waitlistRank });
  }
  return t("prPage.waitlistedNotice");
});

const showExitActionInContext = computed(
  () => props.pr.partnerSection.viewer.isParticipant,
);

const showCancelWaitlistActionInContext = computed(
  () => props.pr.partnerSection.viewer.isWaitlisted,
);

const showContextualActionArea = computed(() =>
  Boolean(
    releaseNoticeText.value ||
      primaryBlockedMessage.value ||
      waitlistNoticeText.value ||
      primaryDockAction.value ||
      showFeedbackRetryAction.value ||
      showCancelWaitlistActionInContext.value ||
      showExitActionInContext.value ||
      primaryActionErrorMessage.value,
  ),
);

const exitBlockedTip = computed(() => {
  const viewer = props.pr.partnerSection.viewer;
  if (viewer.canExit) return null;
  return blockedReasonText(viewer.exitBlockedReason);
});

watch(
  () => [props.prId, primaryDockAction.value?.key ?? null, viewerState.value] as const,
  ([prId, actionKey, state]) => {
    if (prId === null || actionKey === null || !props.supportsEventContextFeatures) {
      return;
    }
    const ctaType = mapDockActionToTrackType(actionKey);
    if (ctaType === null) return;
    const impressionKey = `${prId}:${actionKey}:${state}`;
    if (lastPrimaryImpressionKey.value === impressionKey) return;
    lastPrimaryImpressionKey.value = impressionKey;
    trackEvent("pr_primary_cta_impression", {
      prId,
      ctaType,
      viewerState: state,
    });
  },
  { immediate: true },
);

const handleConfirmWithBookingContact = async () => {
  bookingContactActionError.value = null;

  try {
    await attendanceActions.handleConfirmSlot();
  } catch (error) {
    bookingContactActionError.value =
      error instanceof Error ? error.message : t("errors.confirmSlotFailed");
  }
};

const openFeedbackQuestionnaire = (): void => {
  if (!hasPendingFeedbackQuestionnaire.value) return;
  feedbackModalOpen.value = true;
};

const submitCheckInThenFeedback = async (wouldJoinAgain: boolean) => {
  await attendanceActions.submitCheckIn(wouldJoinAgain);
  if (hasPendingFeedbackQuestionnaire.value) {
    feedbackModalOpen.value = true;
  }
};

const submitFeedbackQuestionnaire = async (
  answers: FeedbackQuestionnaireAnswers,
) => {
  const questionnaire = feedbackQuestionnaire.value;
  if (!questionnaire) return;
  await submitFeedbackMutation.mutateAsync({
    instanceId: questionnaire.instanceId,
    prId: props.prId,
    answers,
  });
  feedbackModalOpen.value = false;
  notifyActionSuccess();
};

const openJoinFlow = async (): Promise<void> => {
  bookingContactActionError.value = null;
  await nextTick();
  if (joinDockAction.value?.key === "WAITLIST") {
    await waitlistFlowRef.value?.open();
    return;
  }
  await joinFlowRef.value?.open();
};

const handleJoinFlowJoined = (): void => {
  notifyActionSuccess();
};

const trackPrimaryActionClick = (action: DockActionItem): void => {
  const ctaType = mapDockActionToTrackType(action.key);
  if (props.prId !== null && ctaType !== null && props.supportsEventContextFeatures) {
    trackEvent("pr_primary_cta_click", {
      prId: props.prId,
      ctaType,
      viewerState: viewerState.value,
    });
  }
};

const handleDockJoinAction = (
  action: DockActionItem,
  open: () => Promise<void>,
): void => {
  if (action.disabled || action.pending) return;
  trackPrimaryActionClick(action);
  void open();
};

const handleDockAction = async (action: DockActionItem) => {
  if (action.disabled || action.pending) return;
  trackPrimaryActionClick(action);

  if (action.key === "JOIN") {
    await openJoinFlow();
    return;
  }
  if (action.key === "CONFIRM") {
    await handleConfirmWithBookingContact();
    return;
  }
  if (action.key === "CHECKIN_ATTENDED") {
    attendanceActions.prepareCheckIn();
  }
};

const requestExitWithConfirm = () => {
  exitActionError.value = null;
  if (!sharedActions.canExit.value) return;
  showExitConfirmModal.value = true;
};

const confirmExit = async () => {
  exitActionError.value = null;
  try {
    await sharedActions.handleExit();
    showExitConfirmModal.value = false;
  } catch (error) {
    exitActionError.value =
      error instanceof Error ? error.message : t("errors.exitRequestFailed");
  }
};

const requestCancelWaitlistWithConfirm = () => {
  cancelWaitlistActionError.value = null;
  if (!showCancelWaitlistActionInContext.value) return;
  showCancelWaitlistConfirmModal.value = true;
};

const confirmCancelWaitlist = async () => {
  cancelWaitlistActionError.value = null;
  if (props.prId === null) return;
  try {
    await cancelWaitlistMutation.mutateAsync({ id: props.prId });
    showCancelWaitlistConfirmModal.value = false;
    notifyActionSuccess();
  } catch (error) {
    cancelWaitlistActionError.value =
      error instanceof Error ? error.message : t("errors.cancelWaitlistFailed");
  }
};

const replayPendingAction = async (kind: ContextualReplayKind): Promise<void> => {
  const viewer = props.pr.partnerSection.viewer;

  if (kind === "PR_JOIN") {
    if (viewer.isParticipant || !viewer.canJoin) return;
    await openJoinFlow();
    return;
  }

  if (kind === "PR_WAITLIST") {
    if (viewer.isParticipant || viewer.isWaitlisted || !viewer.canWaitlist) {
      return;
    }
    await openJoinFlow();
    return;
  }

  if (kind === "PR_EXIT") {
    if (!sharedActions.canExit.value) return;
    await confirmExit();
    return;
  }

  if (!attendanceActions.canConfirm.value) return;
  await handleConfirmWithBookingContact();
};

defineExpose({
  replayPendingAction,
});

function mapDockActionToTrackType(
  key: DockActionKey,
): "JOIN" | "WAITLIST" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT" | null {
  if (key === "JOIN") return "JOIN";
  if (key === "WAITLIST") return "WAITLIST";
  if (key === "CONFIRM") return "CONFIRM_SLOT";
  if (key === "CHECKIN_ATTENDED") return "CHECK_IN";
  return null;
}

function primaryActionTestId(action: DockActionItem): string | undefined {
  if (action.key === "CONFIRM") return "pr-detail.participant.confirm-action";
  if (action.key === "CHECKIN_ATTENDED") return "pr-detail.participant.check-in-action";
  return undefined;
}

function resolveConfirmTip(): string {
  const viewer = props.pr.partnerSection.viewer;
  const timeline = props.pr.partnerSection.timeline;
  if (viewer.confirmBlockedReason === "OUTSIDE_CONFIRM_WINDOW") {
    const confirmationStart = timeline?.confirmationStartAt ?? null;
    if (confirmationStart) {
      const startTime = Date.parse(confirmationStart);
      if (!Number.isNaN(startTime) && Date.now() < startTime) {
        return `确认将在 ${formatLocalDateTimeValue(confirmationStart) ?? confirmationStart} 开放`;
      }
    }
  }
  return blockedReasonText(viewer.confirmBlockedReason);
}

function resolveCheckInTip(): string {
  const viewer = props.pr.partnerSection.viewer;
  if (viewer.checkInBlockedReason === "CHECKIN_NOT_OPEN") {
    const startAt = props.pr.partnerSection.timeline?.eventStartAt ?? null;
    if (startAt) {
      return `活动开始后可签到（${formatLocalDateTimeValue(startAt) ?? startAt}）`;
    }
  }
  return blockedReasonText(viewer.checkInBlockedReason);
}

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
    case "OUTSIDE_CONFIRM_WINDOW": {
      const notSet = t("prPage.partnerSection.notSet");
      return t("prPage.partnerSection.blockedConfirmWindow", {
        confirmStart:
          formatLocalDateTimeValue(
            props.pr.partnerSection.timeline?.confirmationStartAt ?? null,
          ) ?? notSet,
        confirmEnd:
          formatLocalDateTimeValue(
            props.pr.partnerSection.timeline?.confirmationEndAt ?? null,
          ) ?? notSet,
      });
    }
    case "BOOKING_CONTACT_REQUIRED":
      return t("prPage.partnerSection.blockedBookingContactRequired");
    case "ALREADY_CONFIRMED":
      return t("prPage.partnerSection.blockedAlreadyConfirmed");
    case "ALREADY_JOINED":
      return t("prPage.partnerSection.joinedHint");
    case "ALREADY_WAITLISTED":
      return t("prPage.waitlistedNotice");
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

function buttonToneForAction(
  action: DockActionItem,
):
  | "primary"
  | "primary-outline"
  | "secondary"
  | "surface"
  | "danger"
  | "outline"
  | "ghost" {
  if (action.tone === "surface") return "surface";
  if (action.tone === "primary-outline") return "primary-outline";
  if (action.tone === "secondary") return "secondary";
  if (action.tone === "danger") return "danger";
  return "primary";
}
</script>

<style lang="scss" scoped>
.contextual-area {
  margin-top: var(--sys-spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.primary-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.primary-action__button {
  max-width: 100%;
}

.secondary-action,
.secondary-danger-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.action-tip {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.action-error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

.page-action-error {
  margin-top: var(--sys-spacing-small);
}

.modal-actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.modal-actions > button {
  flex: 1 1 180px;
}

.modal-actions--stack {
  flex-direction: column;
}
</style>
