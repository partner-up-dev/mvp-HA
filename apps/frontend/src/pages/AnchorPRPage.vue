<template>
  <PageScaffold class="anchor-pr-page">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <PageHeader
        :title="prDetail.title ?? t('prPage.metaFallbackTitle')"
        @back="goHome"
      >
        <template #top-actions>
          <div v-if="isCreator" class="header-quick-actions">
            <button
              v-if="sharedActions.showEditContentAction.value"
              class="header-quick-btn"
              type="button"
              @click="handleOpenCreatorEdit"
            >
              {{ t("prPage.editContent") }}
            </button>
            <button
              v-if="sharedActions.showModifyStatusAction.value"
              class="header-quick-btn"
              type="button"
              @click="handleOpenCreatorModifyStatus"
            >
              {{ t("prPage.modifyStatus") }}
            </button>
          </div>
        </template>

        <template #meta>
          <span class="type-badge">{{ prDetail.core.type || "-" }}</span>
          <PRStatusBadge :status="prDetail.status" />
        </template>
      </PageHeader>

      <section class="section-card event-fit-card">
        <h2 class="section-title">活动信息</h2>
        <div class="fit-row">
          <span class="fit-label">{{ t("prCard.location") }}</span>
          <span class="fit-value">{{
            prDetail.core.location ?? t("prPage.partnerSection.notSet")
          }}</span>
        </div>
        <button
          v-if="locationGallery.length > 0"
          class="location-gallery-link"
          type="button"
          @click="showLocationGalleryModal = true"
        >
          {{ t("prCard.viewLocationImages") }}
        </button>
        <div class="fit-row">
          <span class="fit-label">{{ t("prCard.time") }}</span>
          <span class="fit-value">{{ localizedTimeText }}</span>
        </div>
        <div class="fit-row fit-row--stack">
          <span class="fit-label">{{ t("prCard.preferences") }}</span>
          <div class="fit-tags">
            <span
              v-for="item in prDetail.core.preferences"
              :key="item"
              class="fit-tag"
            >
              {{ item }}
            </span>
            <span
              v-if="prDetail.core.preferences.length === 0"
              class="fit-empty"
            >
              {{ t("prPage.partnerSection.notSet") }}
            </span>
          </div>
        </div>
        <div class="fit-row fit-row--stack">
          <span class="fit-label">参与概览</span>
          <p class="fit-overview">{{ participantOverviewText }}</p>
          <div class="roster-chips">
            <span
              v-for="item in rosterPreview"
              :key="item.partnerId"
              class="roster-chip"
            >
              {{ item.displayName }}
            </span>
            <span v-if="hasMoreRoster" class="roster-chip">...</span>
          </div>
        </div>
      </section>

      <section
        v-for="action in dockActions"
        :key="action.key"
        class="section-card"
      >
        <button
          class="action-btn"
          :class="{
            'action-btn--danger': action.tone === 'danger',
            'action-btn--secondary': action.tone === 'secondary',
            'action-btn--surface': action.tone === 'surface',
          }"
          type="button"
          :disabled="action.disabled || action.pending"
          @click="handleDockAction(action)"
        >
          {{ action.pending ? action.pendingLabel : action.label }}
        </button>
        <p v-if="action.tip" class="action-tip">{{ action.tip }}</p>
        <p v-if="action.key === 'JOIN' && releaseNoticeText" class="action-tip">
          {{ releaseNoticeText }}
        </p>
      </section>
      <p
        v-if="primaryActionErrorMessage"
        class="action-error page-action-error"
      >
        {{ primaryActionErrorMessage }}
      </p>

      <AnchorPRRecoveryLane
        v-if="showRecoveryLane"
        :pr-id="id"
        :section="prDetail.partnerSection"
        :accept-alternative-batch-pending="
          acceptAlternativeBatchMutation.isPending.value
        "
        @accept-alternative-batch="handleAcceptAlternativeBatch"
      />

      <WeChatNotificationSubscriptionsCard
        v-if="showNotificationSubscriptionsCard"
        :title="t('prPage.notificationSubscriptions.title')"
        :items="subscriptionItems"
        :updating-label="t('prPage.wechatReminder.updating')"
        outline-profile="surface"
        @action="handleSubscriptionAction"
      />

      <section class="section-card">
        <h2 class="section-title">分享邀请</h2>
        <button
          class="action-btn action-btn--surface"
          type="button"
          @click="showShareDrawer = true"
        >
          分享 / 邀请
        </button>
      </section>

      <details class="context-details">
        <summary class="context-summary">更多信息</summary>

        <section class="section-card subsidy-card">
          <div class="booking-support-entry-card__header">
            <h2 class="section-title">补贴与报销</h2>
            <router-link
              v-if="id !== null"
              :to="anchorPRBookingSupportPath(id)"
              class="booking-support-entry-card__action"
            >
              {{ t("prPage.bookingSupportEntry.viewAction") }}
            </router-link>
          </div>
          <p class="section-description">
            {{ t("prPage.bookingSupportEntry.title") }}
          </p>
          <p class="section-description">{{ bookingSupportSummaryHeadline }}</p>
          <p class="section-description">{{ bookingSupportSummaryDeadline }}</p>
          <p
            v-for="highlight in bookingSupportHighlights"
            :key="highlight"
            class="section-description"
          >
            {{ highlight }}
          </p>
          <button
            class="action-btn action-btn--surface"
            type="button"
            :disabled="
              reimbursementButtonDisabled || reimbursementQuery.isLoading.value
            "
            @click="goBookingSupport"
          >
            {{ reimbursementButtonLabel }}
          </button>
          <p v-if="reimbursementDisabledTip" class="action-tip">
            {{ reimbursementDisabledTip }}
          </p>
        </section>

        <AnchorPRAwarenessLane
          :pr-id="prDetail.id"
          :section="prDetail.partnerSection"
        />

        <section
          v-if="prDetail.partnerSection.viewer.isParticipant"
          class="section-card"
        >
          <h2 class="section-title">退出</h2>
          <button
            class="action-btn action-btn--danger"
            type="button"
            :disabled="
              !sharedActions.canExit.value || sharedActions.exitPending.value
            "
            @click="requestExitWithConfirm"
          >
            {{
              sharedActions.exitPending.value
                ? t("prPage.exiting")
                : t("prPage.exit")
            }}
          </button>
          <p
            v-if="!sharedActions.canExit.value && exitBlockedTip"
            class="action-tip"
          >
            {{ exitBlockedTip }}
          </p>
          <p v-if="exitActionError" class="action-error">
            {{ exitActionError }}
          </p>
        </section>
      </details>

      <BottomDrawer
        :open="showShareDrawer"
        title="分享邀请"
        @close="showShareDrawer = false"
      >
        <PRShareSection
          :pr-id="id"
          :share-url="shareUrl"
          :spm-route-key="spmRouteKey"
          :pr-data="prShareData"
          default-method-id="XIAOHONGSHU"
          :auto-rotate-interval-ms="null"
        />
      </BottomDrawer>

      <EditPRContentModal
        v-if="showEditModal && id !== null"
        :open="showEditModal"
        :initial-fields="editableFields"
        :pr-id="id"
        scenario="ANCHOR"
        @close="showEditModal = false"
        @success="handleEditSuccess"
      />

      <UpdatePRStatusModal
        v-if="id !== null"
        :open="showModifyModal"
        :pr-id="id"
        scenario="ANCHOR"
        @close="showModifyModal = false"
      />

      <PRLocationGalleryModal
        :open="showLocationGalleryModal"
        :images="locationGallery"
        @close="showLocationGalleryModal = false"
      />

      <Modal
        :open="showJoinFlowModal"
        title="加入活动"
        @close="closeJoinFlowModal"
      >
        <template v-if="joinFlowStep === 'SUMMARY'">
          <p class="modal-text">确认加入当前活动？</p>
          <p class="modal-text">加入后即可按流程完成确认与签到。</p>
          <div class="modal-actions">
            <button
              class="action-btn action-btn--surface"
              type="button"
              @click="closeJoinFlowModal"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              class="action-btn"
              type="button"
              :disabled="joinFlowPending"
              @click="continueJoinFlow"
            >
              {{ joinFlowPending ? t("prPage.joining") : t("common.confirm") }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="modal-text">当前加入需要你先完成预订联系人手机号授权。</p>
          <div class="modal-actions">
            <button
              class="action-btn action-btn--surface"
              type="button"
              @click="closeJoinFlowModal"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              class="action-btn"
              type="button"
              :disabled="joinFlowPending"
              @click="authorizeBookingContactAndJoin"
            >
              {{ joinFlowPending ? t("prPage.joining") : "授权并加入" }}
            </button>
          </div>
        </template>
        <p v-if="joinFlowError" class="action-error">{{ joinFlowError }}</p>
      </Modal>

      <Modal
        :open="showExitConfirmModal"
        title="确认退出"
        @close="showExitConfirmModal = false"
      >
        <p class="modal-text">退出后你的参与名额会被释放，确认继续？</p>
        <div class="modal-actions">
          <button
            class="action-btn action-btn--surface"
            type="button"
            @click="showExitConfirmModal = false"
          >
            {{ t("common.cancel") }}
          </button>
          <button
            class="action-btn action-btn--danger"
            type="button"
            :disabled="sharedActions.exitPending.value"
            @click="confirmExit"
          >
            {{
              sharedActions.exitPending.value
                ? t("prPage.exiting")
                : t("common.confirm")
            }}
          </button>
        </div>
      </Modal>

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
          <button
            class="action-btn"
            type="button"
            :disabled="attendanceActions.checkInPending.value"
            @click="attendanceActions.submitCheckIn(true)"
          >
            {{ t("prPage.wouldJoinAgainYes") }}
          </button>
          <button
            class="action-btn action-btn--secondary"
            type="button"
            :disabled="attendanceActions.checkInPending.value"
            @click="attendanceActions.submitCheckIn(false)"
          >
            {{ t("prPage.wouldJoinAgainNo") }}
          </button>
          <button
            class="action-btn action-btn--surface"
            type="button"
            :disabled="attendanceActions.checkInPending.value"
            @click="attendanceActions.cancelPendingCheckIn"
          >
            {{ t("common.cancel") }}
          </button>
        </div>
      </Modal>
    </template>

    <ContactSupportFooter />
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";
import PRLocationGalleryModal from "@/domains/pr/ui/modals/PRLocationGalleryModal.vue";
import EditPRContentModal from "@/domains/pr/ui/modals/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/domains/pr/ui/modals/UpdatePRStatusModal.vue";
import WeChatNotificationSubscriptionsCard from "@/shared/ui/sections/WeChatNotificationSubscriptionsCard.vue";
import ContactSupportFooter from "@/domains/support/ui/sections/ContactSupportFooter.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";
import PRShareSection from "@/domains/pr/ui/sections/PRShareSection.vue";
import AnchorPRAwarenessLane from "@/domains/pr/ui/sections/AnchorPRAwarenessLane.vue";
import AnchorPRRecoveryLane from "@/domains/pr/ui/sections/AnchorPRRecoveryLane.vue";
import {
  useAcceptAnchorAlternativeBatch,
  useAnchorPR,
  useAnchorReimbursementStatus,
  useJoinAnchorPR,
  useVerifyAnchorPRBookingContact,
  type AnchorPRDetailResponse,
} from "@/domains/pr/queries/useAnchorPR";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { usePRDetailHead } from "@/domains/pr/use-cases/usePRDetailHead";
import { useSharedPRActions } from "@/domains/pr/use-cases/useSharedPRActions";
import { useAnchorAttendanceActions } from "@/domains/pr/use-cases/useAnchorAttendanceActions";
import { usePRLivePolling } from "@/domains/pr/use-cases/usePRLivePolling";
import { usePRLocationGallery } from "@/domains/pr/use-cases/usePRLocationGallery";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import {
  anchorPRDetailPath,
  anchorPRBookingSupportPath,
} from "@/domains/pr/routing/routes";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import type { AnchorPRFormFields } from "@/domains/pr/model/types";
import {
  formatLocalDateTimeValue,
  formatLocalDateTimeWindow,
} from "@/shared/datetime/formatLocalDateTime";
import { trackEvent } from "@/shared/analytics/track";
import type { ApiError } from "@/shared/api/error";
import { useWeChatPhoneCredential } from "@/shared/wechat/useWeChatPhoneCredential";
import { useWeChatNotificationSubscriptionsPanel } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  type PendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";

type BlockedReason =
  AnchorPRDetailResponse["partnerSection"]["viewer"]["joinBlockedReason"];

type DockActionKey =
  | "JOIN"
  | "CONFIRM"
  | "CHECKIN_ATTENDED"
  | "CHECKIN_MISSED"
  | "CREATOR_EDIT"
  | "CREATOR_STATUS";

type DockActionItem = {
  key: DockActionKey;
  label: string;
  pendingLabel: string;
  tone: "primary" | "secondary" | "surface" | "danger";
  disabled: boolean;
  pending: boolean;
  tip: string | null;
};

type ViewerState =
  | "CREATOR"
  | "PARTICIPANT"
  | "VISITOR_JOINABLE"
  | "VISITOR_BLOCKED";

const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();
const BOOKING_CONTACT_OWNER_REQUIRED_CODE = "BOOKING_CONTACT_OWNER_REQUIRED";
const BOOKING_CONTACT_REQUIRED_CODE = "BOOKING_CONTACT_REQUIRED";

const { data, isLoading, error, refetch } = useAnchorPR(id);
const reimbursementQuery = useAnchorReimbursementStatus(id);
const prDetail = computed(() => data.value);
const reimbursement = computed(() => reimbursementQuery.data.value ?? null);
const joinMutation = useJoinAnchorPR();
const verifyBookingContactMutation = useVerifyAnchorPRBookingContact();
const acceptAlternativeBatchMutation = useAcceptAnchorAlternativeBatch();
const userSessionStore = useUserSessionStore();
const { requestPhoneCredential } = useWeChatPhoneCredential();
const showEditModal = ref(false);
const showModifyModal = ref(false);
const showLocationGalleryModal = ref(false);
const showJoinFlowModal = ref(false);
const showExitConfirmModal = ref(false);
const showShareDrawer = ref(false);
const joinFlowStep = ref<"SUMMARY" | "BOOKING_CONTACT">("SUMMARY");
const joinFlowPending = ref(false);
const joinFlowError = ref<string | null>(null);
const bookingContactActionError = ref<string | null>(null);
const exitActionError = ref<string | null>(null);
const lastPrimaryImpressionKey = ref("");

const editableFields = computed<AnchorPRFormFields>(() => ({
  title: prDetail.value?.title,
  type: prDetail.value?.core.type ?? "",
  time: prDetail.value?.core.time ?? [null, null],
  location: prDetail.value?.core.location ?? null,
  minPartners: prDetail.value?.core.minPartners ?? null,
  maxPartners: prDetail.value?.core.maxPartners ?? null,
  partners: prDetail.value?.core.partners ?? [],
  preferences: prDetail.value?.core.preferences ?? [],
  notes: prDetail.value?.core.notes ?? null,
}));

const { locationId, locationGallery } = usePRLocationGallery(
  computed(() => prDetail.value?.core.location ?? null),
);

watch(locationId, () => {
  showLocationGalleryModal.value = false;
});

const isCreator = computed(() => {
  const createdBy = prDetail.value?.createdBy ?? null;
  if (!createdBy) return false;
  return userSessionStore.userId === createdBy;
});

const { resetLivePolling } = usePRLivePolling({
  id,
  refetch,
});

const sharedActions = useSharedPRActions({
  id,
  pr: prDetail,
  isCreator,
  scenario: "ANCHOR",
  onActionSuccess: resetLivePolling,
});
const attendanceActions = useAnchorAttendanceActions({
  id,
  pr: prDetail,
  onActionSuccess: resetLivePolling,
});
const currentBookingContact = computed(
  () => prDetail.value?.partnerSection.bookingContact ?? null,
);
const primaryActionErrorMessage = computed(
  () => bookingContactActionError.value ?? sharedActions.joinErrorMessage.value,
);

watch(
  () => currentBookingContact.value?.state,
  (state) => {
    if (state === "VERIFIED") {
      bookingContactActionError.value = null;
    }
  },
);

const notificationSubscriptions = useWeChatNotificationSubscriptionsPanel({
  visibleKinds: [
    "REMINDER_CONFIRMATION",
    "BOOKING_RESULT",
    "NEW_PARTNER",
  ] as const,
});

useBodyScrollLock(
  computed(
    () =>
      showEditModal.value ||
      showModifyModal.value ||
      showLocationGalleryModal.value ||
      showJoinFlowModal.value ||
      showExitConfirmModal.value ||
      showShareDrawer.value ||
      attendanceActions.showCheckInFollowup.value,
  ),
);

const { shareUrl, spmRouteKey, prShareData } = usePRShareContext({
  id,
  pr: prDetail,
});
usePRDetailHead({ pr: prDetail, shareUrl });

const localizedTime = computed<[string | null, string | null]>(() =>
  formatLocalDateTimeWindow(prDetail.value?.core.time ?? [null, null]),
);
const localizedTimeText = computed(() => {
  const [start, end] = localizedTime.value;
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? t("prPage.partnerSection.notSet");
});

const participantOverviewText = computed(() => {
  if (!prDetail.value) return "";
  const current = prDetail.value.partnerSection.capacity.current;
  const min = prDetail.value.partnerSection.capacity.min;
  if (min === null) return `${current} 人已加入，当前未设置最低成团人数。`;
  return `${current} 人已加入，最低成团人数 ${min} 人。`;
});

const releaseNoticeText = computed(() => {
  const releasedSlot = prDetail.value?.partnerSection.viewer.releasedSlot ?? null;
  if (!releasedSlot) return null;
  if (releasedSlot.state === "EXITED") {
    return t("prPage.partnerSection.releaseNoticeExit");
  }
  return t("prPage.partnerSection.releaseNoticeAuto");
});

const showRecoveryLane = computed(() => {
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer) return false;
  return !viewer.isParticipant && !viewer.canJoin;
});

const rosterPreview = computed(
  () => prDetail.value?.partnerSection.roster.slice(0, 4) ?? [],
);
const hasMoreRoster = computed(
  () =>
    (prDetail.value?.partnerSection.roster.length ?? 0) >
    rosterPreview.value.length,
);

const bookingSupportSummaryHeadline = computed(() => {
  return (
    prDetail.value?.anchor.bookingSupportPreview.headline ??
    t("prPage.bookingSupportEntry.headlineFallback")
  );
});
const bookingSupportHighlights = computed(
  () =>
    prDetail.value?.anchor.bookingSupportPreview.highlights.slice(1, 3) ?? [],
);
const bookingSupportSummaryDeadline = computed(() => {
  const deadline =
    prDetail.value?.anchor.bookingSupportPreview.effectiveBookingDeadlineAt ??
    null;
  if (!deadline) return t("prPage.bookingSupportEntry.deadlineUnset");
  return t("prPage.bookingSupportEntry.deadlineWithValue", {
    deadline:
      formatLocalDateTimeValue(deadline) ??
      t("prPage.bookingSupportEntry.deadlineUnset"),
  });
});

const eventEndAt = computed(() => prDetail.value?.core.time[1] ?? null);
const hasEventEnded = computed(() => {
  const endAt = eventEndAt.value;
  if (!endAt) return false;
  const parsed = Date.parse(endAt);
  if (Number.isNaN(parsed)) return false;
  return Date.now() >= parsed;
});

const reimbursementButtonDisabled = computed(() => {
  if (reimbursementQuery.isLoading.value) return true;
  if (!hasEventEnded.value) return true;
  const status = reimbursement.value;
  if (!status) return true;
  return !(status.eligible && status.canRequest);
});

const reimbursementButtonLabel = computed(() => {
  if (reimbursementQuery.isLoading.value) return t("common.loading");
  return t("prBookingSupport.reimbursement.title");
});

const reimbursementDisabledTip = computed(() => {
  if (!hasEventEnded.value) {
    return "活动结束后可申请报销。";
  }
  const status = reimbursement.value;
  if (!status) return t("errors.fetchReimbursementStatusFailed");
  if (status.reason) return reimbursementReasonText(status.reason);
  if (!status.canRequest)
    return t("prBookingSupport.reimbursement.reasonAlreadyRequested");
  return null;
});

const viewerState = computed<ViewerState>(() => {
  if (!prDetail.value) return "VISITOR_BLOCKED";
  if (prDetail.value.partnerSection.viewer.isCreator) return "CREATOR";
  if (prDetail.value.partnerSection.viewer.isParticipant) return "PARTICIPANT";
  return prDetail.value.partnerSection.viewer.canJoin
    ? "VISITOR_JOINABLE"
    : "VISITOR_BLOCKED";
});

const dockActions = computed<DockActionItem[]>(() => {
  if (!prDetail.value) return [];

  if (isCreator.value) {
    const creatorActions: DockActionItem[] = [];
    if (sharedActions.showEditContentAction.value) {
      creatorActions.push({
        key: "CREATOR_EDIT",
        label: t("prPage.editContent"),
        pendingLabel: t("prPage.editContent"),
        tone: "surface",
        disabled: false,
        pending: false,
        tip: null,
      });
    }
    if (sharedActions.showModifyStatusAction.value) {
      creatorActions.push({
        key: "CREATOR_STATUS",
        label: t("prPage.modifyStatus"),
        pendingLabel: t("prPage.modifyStatus"),
        tone: "surface",
        disabled: false,
        pending: false,
        tip: null,
      });
    }
    if (creatorActions.length > 0) return creatorActions.slice(0, 2);
  }

  const viewer = prDetail.value.partnerSection.viewer;
  if (!viewer.isParticipant) {
    return [
      {
        key: "JOIN",
        label: t("prPage.join"),
        pendingLabel: t("prPage.joining"),
        tone: "primary",
        disabled: !viewer.canJoin,
        pending: sharedActions.joinPending.value,
        tip: viewer.canJoin
          ? null
          : blockedReasonText(viewer.joinBlockedReason),
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

  if (viewer.slotState === "CONFIRMED" || viewer.slotState === "ATTENDED") {
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
      {
        key: "CHECKIN_MISSED",
        label: t("prPage.checkInMissed"),
        pendingLabel: t("prPage.checkingIn"),
        tone: "secondary",
        disabled: !viewer.canCheckIn,
        pending: attendanceActions.checkInPending.value,
        tip: checkInTip,
      },
    ];
  }

  return [];
});

const primaryDockAction = computed(() => dockActions.value[0] ?? null);

watch(
  () =>
    [
      id.value,
      primaryDockAction.value?.key ?? null,
      viewerState.value,
    ] as const,
  ([prId, actionKey, state]) => {
    if (prId === null || actionKey === null) return;
    const ctaType = mapDockActionToTrackType(actionKey);
    if (ctaType === null) return;
    const impressionKey = `${prId}:${actionKey}:${state}`;
    if (lastPrimaryImpressionKey.value === impressionKey) return;
    lastPrimaryImpressionKey.value = impressionKey;
    trackEvent("anchor_pr_primary_cta_impression", {
      prId,
      prKind: "ANCHOR",
      ctaType,
      viewerState: state,
    });
  },
  { immediate: true },
);

const showNotificationSubscriptionsCard = computed(() => {
  const section = prDetail.value?.partnerSection;
  if (!section?.reminder.supported) return false;
  return section.viewer.isParticipant;
});

const subscriptionItems = computed(() => notificationSubscriptions.items.value);

const exitBlockedTip = computed(() => {
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer || viewer.canExit) return null;
  return blockedReasonText(viewer.exitBlockedReason);
});

const joinFlowNeedsBookingContact = computed(() => {
  const bookingContact = currentBookingContact.value;
  return Boolean(
    bookingContact?.required && bookingContact.ownerPartnerId === null,
  );
});

const requestBookingContactCredential = async (): Promise<string | null> => {
  try {
    return await requestPhoneCredential();
  } catch (error) {
    bookingContactActionError.value =
      error instanceof Error
        ? error.message
        : t("prPage.bookingContact.verifyFailed");
    return null;
  }
};

const closeJoinFlowModal = () => {
  showJoinFlowModal.value = false;
  joinFlowStep.value = "SUMMARY";
  joinFlowPending.value = false;
  joinFlowError.value = null;
};

const openJoinFlowModal = () => {
  bookingContactActionError.value = null;
  joinFlowError.value = null;
  joinFlowPending.value = false;
  joinFlowStep.value = "SUMMARY";
  showJoinFlowModal.value = true;
};

const finalizeJoinFlow = async (
  wechatPhoneCredential?: string | null,
) => {
  joinFlowPending.value = true;
  joinFlowError.value = null;
  bookingContactActionError.value = null;
  const result = await sharedActions.handleJoin({ wechatPhoneCredential });
  joinFlowPending.value = false;
  if (result) {
    closeJoinFlowModal();
    return;
  }
  joinFlowError.value =
    primaryActionErrorMessage.value ?? t("errors.joinRequestFailed");
};

const continueJoinFlow = async () => {
  if (joinFlowPending.value) return;
  if (joinFlowNeedsBookingContact.value) {
    joinFlowStep.value = "BOOKING_CONTACT";
    return;
  }
  await finalizeJoinFlow();
};

const authorizeBookingContactAndJoin = async () => {
  if (joinFlowPending.value) return;
  const wechatPhoneCredential = await requestBookingContactCredential();
  if (!wechatPhoneCredential) {
    joinFlowError.value =
      bookingContactActionError.value ??
      t("prPage.bookingContact.verifyFailed");
    return;
  }
  await finalizeJoinFlow(wechatPhoneCredential);
};

const ensureBookingContactVerified = async (): Promise<boolean> => {
  if (id.value === null) return false;

  const bookingContact = currentBookingContact.value;
  if (!bookingContact?.required || bookingContact.state === "VERIFIED") {
    return true;
  }
  if (!bookingContact.ownerIsCurrentViewer) {
    bookingContactActionError.value = t(
      "prPage.bookingContact.ownerBlockedHint",
    );
    return false;
  }

  const wechatPhoneCredential = await requestBookingContactCredential();
  if (!wechatPhoneCredential) {
    return false;
  }

  try {
    await verifyBookingContactMutation.mutateAsync({
      id: id.value,
      wechatPhoneCredential,
    });
    await refetch();
    bookingContactActionError.value = null;
    return true;
  } catch (error) {
    bookingContactActionError.value =
      error instanceof Error
        ? error.message
        : t("prPage.bookingContact.verifyFailed");
    return false;
  }
};

const handleConfirmWithBookingContact = async () => {
  bookingContactActionError.value = null;

  try {
    await attendanceActions.handleConfirmSlot();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === BOOKING_CONTACT_REQUIRED_CODE) {
      const verified = await ensureBookingContactVerified();
      if (!verified) {
        return;
      }
      try {
        await attendanceActions.handleConfirmSlot();
        bookingContactActionError.value = null;
      } catch (retryError) {
        bookingContactActionError.value =
          retryError instanceof Error
            ? retryError.message
            : t("errors.confirmSlotFailed");
      }
      return;
    }
    bookingContactActionError.value =
      apiError.message ?? t("errors.confirmSlotFailed");
  }
};

const pendingActionReplayRunning = ref(false);

const matchPendingActionForCurrentPR = (
  pending: PendingWeChatAction | null,
): PendingWeChatAction | null => {
  if (!pending || id.value === null) {
    return null;
  }
  if (
    pending.kind === "ANCHOR_PR_JOIN" ||
    pending.kind === "ANCHOR_PR_EXIT" ||
    pending.kind === "ANCHOR_PR_CONFIRM"
  ) {
    return pending.prId === id.value ? pending : null;
  }
  return null;
};

const attemptPendingWeChatActionReplay = async () => {
  if (pendingActionReplayRunning.value) return;
  if (id.value === null || !prDetail.value) return;

  const pending = matchPendingActionForCurrentPR(readPendingWeChatAction());
  if (!pending) return;

  pendingActionReplayRunning.value = true;
  clearPendingWeChatAction();
  try {
    if (pending.kind === "ANCHOR_PR_JOIN") {
      const viewer = prDetail.value.partnerSection.viewer;
      if (viewer.isParticipant || !viewer.canJoin) return;
      if (joinFlowNeedsBookingContact.value) {
        openJoinFlowModal();
        return;
      }
      await finalizeJoinFlow();
      return;
    }

    if (pending.kind === "ANCHOR_PR_EXIT") {
      if (!sharedActions.canExit.value) return;
      await sharedActions.handleExit();
      return;
    }

    if (!attendanceActions.canConfirm.value) return;
    await handleConfirmWithBookingContact();
  } catch (error) {
    if (pending.kind === "ANCHOR_PR_EXIT") {
      exitActionError.value =
        error instanceof Error ? error.message : t("errors.exitRequestFailed");
    } else {
      bookingContactActionError.value =
        error instanceof Error ? error.message : t("common.operationFailed");
    }
  } finally {
    pendingActionReplayRunning.value = false;
  }
};

watch(
  () =>
    [
      id.value,
      prDetail.value?.partnerSection.viewer.isParticipant,
      prDetail.value?.partnerSection.viewer.canJoin,
      prDetail.value?.partnerSection.viewer.canExit,
      prDetail.value?.partnerSection.viewer.canConfirm,
    ] as const,
  () => {
    void attemptPendingWeChatActionReplay();
  },
  { immediate: true },
);

onMounted(() => {
  void attemptPendingWeChatActionReplay();
});

const handleAcceptAlternativeBatch = async (
  targetTimeWindow: [string | null, string | null],
) => {
  if (id.value === null) return;
  const result = await acceptAlternativeBatchMutation.mutateAsync({
    id: id.value,
    targetTimeWindow,
  });
  try {
    await joinMutation.mutateAsync({ id: result.prId as PRId });
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === BOOKING_CONTACT_OWNER_REQUIRED_CODE) {
      const wechatPhoneCredential = await requestBookingContactCredential();
      if (wechatPhoneCredential) {
        try {
          await joinMutation.mutateAsync({
            id: result.prId as PRId,
            wechatPhoneCredential,
          });
          bookingContactActionError.value = null;
        } catch (retryError) {
          bookingContactActionError.value =
            retryError instanceof Error
              ? retryError.message
              : t("errors.joinRequestFailed");
        }
      }
    } else {
      bookingContactActionError.value =
        apiError.message ?? t("errors.joinRequestFailed");
    }
  }
  await router.push(anchorPRDetailPath(result.prId as PRId));
};

const handleDockAction = async (action: DockActionItem) => {
  if (action.disabled || action.pending) return;
  const ctaType = mapDockActionToTrackType(action.key);
  if (id.value !== null) {
    if (ctaType !== null) {
      trackEvent("anchor_pr_primary_cta_click", {
        prId: id.value,
        prKind: "ANCHOR",
        ctaType,
        viewerState: viewerState.value,
      });
    }
  }

  if (action.key === "JOIN") {
    openJoinFlowModal();
    return;
  }
  if (action.key === "CONFIRM") {
    await handleConfirmWithBookingContact();
    return;
  }
  if (action.key === "CHECKIN_ATTENDED") {
    attendanceActions.prepareCheckIn(true);
    return;
  }
  if (action.key === "CHECKIN_MISSED") {
    attendanceActions.prepareCheckIn(false);
    return;
  }
  if (action.key === "CREATOR_EDIT") {
    handleOpenCreatorEdit();
    return;
  }
  handleOpenCreatorModifyStatus();
};

const handleSubscriptionAction = async (
  kind: "REMINDER_CONFIRMATION" | "BOOKING_RESULT" | "NEW_PARTNER",
) => {
  await notificationSubscriptions.handleAction(kind);
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

const goBookingSupport = () => {
  if (id.value === null) return;
  router.push(anchorPRBookingSupportPath(id.value));
};

const handleEditSuccess = () => {
  showEditModal.value = false;
};
const handleOpenCreatorEdit = () => {
  if (id.value !== null) {
    trackEvent("anchor_pr_secondary_action_click", {
      prId: id.value,
      prKind: "ANCHOR",
      actionType: "CREATOR_EDIT_CONTENT",
    });
  }
  showEditModal.value = true;
};
const handleOpenCreatorModifyStatus = () => {
  if (id.value !== null) {
    trackEvent("anchor_pr_secondary_action_click", {
      prId: id.value,
      prKind: "ANCHOR",
      actionType: "CREATOR_MODIFY_STATUS",
    });
  }
  showModifyModal.value = true;
};

function mapDockActionToTrackType(
  key: DockActionKey,
): "JOIN" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT" | null {
  if (key === "JOIN") return "JOIN";
  if (key === "CONFIRM") return "CONFIRM_SLOT";
  if (key === "CHECKIN_ATTENDED" || key === "CHECKIN_MISSED") return "CHECK_IN";
  return null;
}

function resolveConfirmTip(): string {
  const viewer = prDetail.value?.partnerSection.viewer;
  const timeline = prDetail.value?.partnerSection.timeline;
  if (!viewer) return "";
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
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer) return "";
  if (viewer.checkInBlockedReason === "CHECKIN_NOT_OPEN") {
    const startAt =
      prDetail.value?.partnerSection.timeline?.eventStartAt ?? null;
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
            prDetail.value?.partnerSection.timeline?.confirmationStartAt ??
              null,
          ) ?? notSet,
        confirmEnd:
          formatLocalDateTimeValue(
            prDetail.value?.partnerSection.timeline?.confirmationEndAt ?? null,
          ) ?? notSet,
      });
    }
    case "BOOKING_CONTACT_REQUIRED":
      return t("prPage.partnerSection.blockedBookingContactRequired");
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

const reimbursementReasonText = (
  reason:
    | "NO_POSTPAID_SUPPORT"
    | "PR_NOT_CLOSED"
    | "SLOT_NOT_ELIGIBLE"
    | "ALREADY_REQUESTED",
): string => {
  if (reason === "NO_POSTPAID_SUPPORT") {
    return t("prBookingSupport.reimbursement.reasonNoPostpaidSupport");
  }
  if (reason === "PR_NOT_CLOSED") {
    return t("prBookingSupport.reimbursement.reasonPrNotClosed");
  }
  if (reason === "SLOT_NOT_ELIGIBLE") {
    return t("prBookingSupport.reimbursement.reasonSlotNotEligible");
  }
  return t("prBookingSupport.reimbursement.reasonAlreadyRequested");
};

const goHome = () => {
  router.push("/");
};
</script>

<style lang="scss" scoped>
.header-quick-actions {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xs);
}

.header-quick-btn {
  @include mx.pu-font(label-medium);
  @include mx.pu-rect-action(outline, default);
  border: none;
  cursor: pointer;
  padding-inline: var(--sys-spacing-sm);
}

.type-badge {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.section-card {
  margin-top: var(--sys-spacing-lg);
  @include mx.pu-surface-card(section);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.section-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.section-description {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.fit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.fit-row--stack {
  flex-direction: column;
  align-items: flex-start;
}

.fit-label {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.fit-value {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
  text-align: right;
}

.fit-tags,
.roster-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs);
}

.fit-tag,
.roster-chip {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.fit-empty {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.fit-overview {
  margin: 0;
  @include mx.pu-font(body-medium);
}

.booking-support-entry-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.booking-support-entry-card__action {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-primary);
  text-decoration: none;
}

.location-gallery-link {
  @include mx.pu-font(label-medium);
  border: none;
  padding: 0;
  color: var(--sys-color-primary);
  background: transparent;
  width: fit-content;
  cursor: pointer;
  text-decoration: underline;
}

.action-btn {
  @include mx.pu-rect-action(primary, default);
  @include mx.pu-font(label-large);
  border: none;
  cursor: pointer;
}

.action-btn:disabled {
  cursor: not-allowed;
  background: color-mix(in srgb, var(--sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--sys-color-on-surface) 38%, transparent);
  box-shadow: none;
}

.action-btn--secondary {
  @include mx.pu-rect-action(outline-primary, default);
}

.action-btn--surface {
  @include mx.pu-rect-action(outline, default);
}

.action-btn--danger {
  @include mx.pu-rect-action(danger, default);
}

.action-btn--secondary:disabled,
.action-btn--surface:disabled,
.action-btn--danger:disabled {
  background: transparent;
  border-color: color-mix(
    in srgb,
    var(--sys-color-on-surface) 12%,
    transparent
  );
  color: color-mix(in srgb, var(--sys-color-on-surface) 38%, transparent);
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
  margin-top: var(--sys-spacing-sm);
}

.subscription-card {
  @include mx.pu-surface-card(outline);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.subscription-main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.subscription-title {
  margin: 0;
  @include mx.pu-font(label-large);
}

.subscription-desc {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.context-details {
  margin-top: var(--sys-spacing-lg);
}

.context-summary {
  @include mx.pu-font(title-small);
  cursor: pointer;
}

.modal-text {
  margin: 0 0 var(--sys-spacing-sm);
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.modal-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.modal-actions > button {
  flex: 1 1 180px;
}

.modal-actions--stack {
  flex-direction: column;
}

@media (max-width: 879px) {
  .fit-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .fit-value {
    text-align: left;
  }

  .header-quick-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
