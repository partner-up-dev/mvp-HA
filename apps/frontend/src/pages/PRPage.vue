<template>
  <PageScaffold class="pr-page" data-page="pr-detail">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <PageHeader
        :title="prDisplayTitle"
        :back-fallback-to="backFallbackTo"
        data-region="summary"
      >
        <template #top-actions>
          <div v-if="showHeaderQuickActions" class="header-quick-actions">
            <Button
              v-if="sharedActions.showEditContentAction.value"
              tone="outline"
              size="sm"
              type="button"
              @click="handleOpenCreatorEdit"
            >
              {{ t("prPage.editContent") }}
            </Button>
            <Button
              v-if="sharedActions.showModifyStatusAction.value"
              tone="outline"
              size="sm"
              type="button"
              @click="handleOpenCreatorModifyStatus"
            >
              {{ t("prPage.modifyStatus") }}
            </Button>
          </div>
        </template>

        <template #meta>
          <span class="type-badge">{{ prDetail.core.type || "-" }}</span>
          <PRStatusBadge :status="prDetail.status" />
        </template>
      </PageHeader>

      <InlineNotice
        v-if="showDraftPublishCard"
        tone="warning"
        :message="t('prPage.publishDraft.description')"
      >
        <template #actions>
          <Button
            type="button"
            :loading="publishMutation.isPending.value"
            @click="handlePublishDraft"
          >
            {{
              publishMutation.isPending.value
                ? t("prPage.publishDraft.pending")
                : t("prPage.publishDraft.action")
            }}
          </Button>
        </template>
      </InlineNotice>

      <InlineNotice
        v-if="showEventAssistedCreateHandoffNotice"
        tone="success"
        :title="t('prPage.eventAssistedCreateHandoff.title')"
        :message="t('prPage.eventAssistedCreateHandoff.description')"
      />

      <div
        ref="factsCardTargetRef"
        class="facts-card"
        :class="{ 'facts-card--handoff-hidden': shouldHideFactsForHandoff }"
        data-region="summary"
      >
        <PRFactsCard :pr-id="prDetail.id" @ready="handleFactsCardReady" />
      </div>

      <section
        v-if="showContextualActionArea"
        class="contextual-area"
        data-region="actions"
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

        <component
          :is="joinFlowComponent"
          v-if="joinDockAction"
          ref="joinFlowRef"
          :pr-id="id"
          :disabled="joinDockAction?.disabled ?? true"
          :scenario-type="prDetail.core.type"
          :event-id="routeEventId"
          :entry-surface="joinEntrySurface"
          :confirmation-deadline-at="confirmationDeadlineAt"
          :viewer-is-participant="prDetail.partnerSection.viewer.isParticipant"
          write-join-entry-on-auth
          @joined="handleJoinFlowJoined"
        >
          <template
            #default="{ open, pending, disabled, joined, errorMessage }"
          >
            <div v-if="joinDockAction" class="primary-action">
              <Button
                class="primary-action__button"
                :tone="buttonToneForAction(joinDockAction)"
                :disabled="disabled"
                :loading="pending"
                block
                @click="handleDockJoinAction(joinDockAction, open)"
              >
                {{
                  joined
                    ? joinDockAction.key === "WAITLIST"
                      ? t("prPage.waitlisted")
                      : t("prPage.partnerSection.rosterJoined")
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
        </component>

        <div v-if="nonJoinPrimaryDockAction" class="primary-action">
          <Button
            class="primary-action__button"
            :tone="buttonToneForAction(nonJoinPrimaryDockAction)"
            :disabled="nonJoinPrimaryDockAction.disabled"
            :loading="nonJoinPrimaryDockAction.pending"
            block
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

        <p
          v-if="primaryActionErrorMessage"
          class="action-error page-action-error"
        >
          {{ primaryActionErrorMessage }}
        </p>
      </section>

      <section class="utility-area">
        <div class="utility-actions">
          <Button
            v-if="showBookingSupportEntry"
            tone="outline"
            block
            @click="goBookingSupport"
          >
            {{ t("prPage.bookingSupportEntry.viewAction") }}
          </Button>

          <Button
            v-if="showMessageThread && id !== null"
            tone="outline"
            block
            @click="handleOpenMessages"
          >
            {{ t("prPage.messageEntry.action") }}
          </Button>

          <div class="utility-action-group" data-region="share">
            <Button tone="outline" block @click="showShareDrawer = true">
              {{ t("prPage.shareEntry.action") }}
            </Button>
            <div v-if="showEventPlazaLink" class="utility-link-row">
              <router-link :to="{ name: 'event-plaza' }" class="utility-link">
                {{ t("anchorEvent.otherEvents.action") }}
                <span
                  class="utility-link__icon i-mdi:arrow-right"
                  aria-hidden="true"
                />
              </router-link>
            </div>
          </div>
        </div>

        <section
          v-if="showInlineReminderSubscriptions"
          class="utility-section"
          data-region="reliability"
        >
          <div class="utility-section__content">
            <h2 class="utility-section__title">
              {{ t("prPage.notificationSubscriptions.title") }}
            </h2>
            <APRNotificationSubscriptions
              :updating-label="t('prPage.wechatReminder.updating')"
              outline-profile="surface"
            />
          </div>
        </section>
      </section>

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
        :show-budget-field="showBudgetField"
        :show-time-field="showTimeField"
        @close="showEditModal = false"
        @success="handleEditSuccess"
      />

      <UpdatePRStatusModal
        v-if="id !== null"
        :open="showModifyModal"
        :pr-id="id"
        @close="showModifyModal = false"
      />

      <ConfirmDialog
        :open="showExitConfirmModal"
        title="确认退出"
        message="退出后你的参与名额会被释放，确认继续？"
        :confirm-label="
          sharedActions.exitPending.value
            ? t('prPage.exiting')
            : t('common.confirm')
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
            @click="attendanceActions.submitCheckIn(true)"
          >
            {{ t("prPage.wouldJoinAgainYes") }}
          </Button>
          <Button
            tone="primary-outline"
            type="button"
            :disabled="attendanceActions.checkInPending.value"
            @click="attendanceActions.submitCheckIn(false)"
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
    </template>

    <MiniumCommonFooter data-region="support" />
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import ConfirmDialog from "@/shared/ui/overlay/ConfirmDialog.vue";
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";
import Button from "@/shared/ui/actions/Button.vue";
import EditPRContentModal from "@/domains/pr/ui/modals/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/domains/pr/ui/modals/UpdatePRStatusModal.vue";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import MiniumCommonFooter from "@/domains/support/ui/sections/MiniumCommonFooter.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";
import PRShareSection from "@/domains/pr/ui/sections/PRShareSection.vue";
import PRFactsCard from "@/domains/pr/ui/composites/PRFactsCard.vue";
import PRJoinFlow from "@/domains/pr/ui/composites/PRJoinFlow.vue";
import PRWaitlistFlow from "@/domains/pr/ui/composites/PRWaitlistFlow.vue";
import { usePublishPR } from "@/domains/pr/queries/usePRPublish";
import {
  usePRDetail,
  type PRDetailResponse,
} from "@/domains/pr/queries/usePRDetail";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { usePRDetailHead } from "@/domains/pr/use-cases/usePRDetailHead";
import { usePRRouteShareDescriptor } from "@/domains/pr/use-cases/usePRRouteShareDescriptor";
import { useSharedPRActions } from "@/domains/pr/use-cases/useSharedPRActions";
import { usePRAttendanceActions } from "@/domains/pr/use-cases/usePRAttendanceActions";
import { usePRLivePolling } from "@/domains/pr/use-cases/usePRLivePolling";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import { useCancelWaitlistPR } from "@/domains/pr/queries/usePRActions";
import { useRouteShareDescriptorRegistration } from "@/domains/share/use-cases/route-share-controller";
import {
  prBookingSupportPath,
  prMessagesPath,
} from "@/domains/pr/routing/routes";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import { type PRFormFields } from "@/domains/pr/model/types";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import { trackEvent } from "@/shared/telemetry/track";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  type PendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import { useMatchedPRHandoff } from "@/processes/route-handoff/useMatchedPRHandoff";

type BlockedReason =
  | PRDetailResponse["partnerSection"]["viewer"]["joinBlockedReason"]
  | PRDetailResponse["partnerSection"]["viewer"]["waitlistBlockedReason"];
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

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();
const userSessionStore = useUserSessionStore();

const { data, isLoading, error, refetch } = usePRDetail(id);
const prDetail = computed(() => data.value);
const currentDetail = computed(() => prDetail.value);
const prDisplayTitle = computed(() => {
  const explicitTitle = prDetail.value?.title?.trim() ?? "";
  if (explicitTitle.length > 0) return explicitTitle;
  const location = prDetail.value?.core.location?.trim() ?? "";
  if (location.length > 0) return location;
  const type = prDetail.value?.core.type?.trim() ?? "";
  if (type.length > 0) return type;
  return t("prPage.displayFallbackTitle");
});
const confirmationDeadlineAt = computed(
  () => prDetail.value?.partnerSection.timeline?.confirmationEndAt ?? null,
);
const supportsEventContextFeatures = computed(
  () => prDetail.value?.partnerSection.reminder.supported ?? false,
);
const routeEventId = computed(() => {
  const routeEventIdRaw = route.query.fromEvent;
  const routeEventId =
    typeof routeEventIdRaw === "string" ? Number(routeEventIdRaw) : null;
  if (
    routeEventId !== null &&
    Number.isFinite(routeEventId) &&
    routeEventId > 0
  ) {
    return routeEventId;
  }
  return null;
});
const backFallbackTo = computed(() => {
  if (routeEventId.value !== null) {
    return `/events/${routeEventId.value}`;
  }
  return "/";
});
const publishMutation = usePublishPR();
const showEditModal = ref(false);
const showModifyModal = ref(false);
const showExitConfirmModal = ref(false);
const showCancelWaitlistConfirmModal = ref(false);
const showShareDrawer = ref(false);
const bookingContactActionError = ref<string | null>(null);
const exitActionError = ref<string | null>(null);
const cancelWaitlistActionError = ref<string | null>(null);
const lastPrimaryImpressionKey = ref("");
const factsCardTargetRef = ref<HTMLElement | null>(null);
const matchedPRHandoff = useMatchedPRHandoff();
const joinFlowRef = ref<{ open: () => Promise<void> } | null>(null);
const cancelWaitlistMutation = useCancelWaitlistPR();

const editableFields = computed<PRFormFields>(() => ({
  title: prDetail.value?.title,
  type: prDetail.value?.core.type ?? "",
  time: prDetail.value?.core.time ?? [null, null],
  location: prDetail.value?.core.location ?? null,
  minPartners: prDetail.value?.core.minPartners ?? null,
  maxPartners: prDetail.value?.core.maxPartners ?? null,
  partners: prDetail.value?.core.partners ?? [],
  budget: prDetail.value?.core.budget ?? null,
  preferences: prDetail.value?.core.preferences ?? [],
  notes: prDetail.value?.core.notes ?? null,
  meetingPoint: prDetail.value?.core.meetingPoint
    ? {
        description: prDetail.value.core.meetingPoint.description,
        imageUrl: prDetail.value.core.meetingPoint.imageUrl,
      }
    : null,
}));
const showBudgetField = computed(() => !supportsEventContextFeatures.value);
const showTimeField = computed(() => !supportsEventContextFeatures.value);

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
  onActionSuccess: resetLivePolling,
});
const showHeaderQuickActions = computed(
  () =>
    sharedActions.showEditContentAction.value ||
    sharedActions.showModifyStatusAction.value,
);
const attendanceActions = usePRAttendanceActions({
  id,
  pr: currentDetail,
  onActionSuccess: resetLivePolling,
});
const creationEntry = computed(() => {
  const raw = route.query.entry;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
});
const handoffEntry = computed(() => {
  const raw = route.query.handoff;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
});
const joinEntrySurface = computed(() =>
  handoffEntry.value === "matched_pr" ? "form_mode_matched" : "pr_detail",
);
const showDraftPublishCard = computed(() => prDetail.value?.status === "DRAFT");
const showEventAssistedCreateHandoffNotice = computed(
  () => isCreator.value && handoffEntry.value === "event_assisted_create",
);
const primaryActionErrorMessage = computed(
  () => bookingContactActionError.value,
);

const shouldHideFactsForHandoff = computed(() =>
  matchedPRHandoff.shouldHideTargetForPR(id.value),
);

const registerFactsCardTarget = () => {
  if (id.value === null || !matchedPRHandoff.isActiveForPR(id.value)) {
    return;
  }

  const target = factsCardTargetRef.value;
  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  matchedPRHandoff.registerTargetRect(id.value, {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  });
};

const handleFactsCardReady = async () => {
  await nextTick();
  registerFactsCardTarget();
};

useBodyScrollLock(
  computed(
    () =>
      showEditModal.value ||
      showModifyModal.value ||
      showExitConfirmModal.value ||
      showCancelWaitlistConfirmModal.value ||
      showShareDrawer.value ||
      attendanceActions.showCheckInFollowup.value,
  ),
);

const { shareUrl, spmRouteKey, prShareData } = usePRShareContext({
  id,
  pr: prDetail,
});
const routeShareDescriptor = usePRRouteShareDescriptor({
  id,
  pr: prDetail,
  spmRouteKey,
});
usePRDetailHead({ pr: prDetail, shareUrl });
useRouteShareDescriptorRegistration(routeShareDescriptor);

const releaseNoticeText = computed(() => {
  const releasedSlot =
    prDetail.value?.partnerSection.viewer.releasedSlot ?? null;
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
  if (!prDetail.value) return "VISITOR_BLOCKED";
  if (prDetail.value.partnerSection.viewer.isParticipant) return "PARTICIPANT";
  if (prDetail.value.partnerSection.viewer.isCreator) return "CREATOR";
  if (prDetail.value.partnerSection.viewer.isWaitlisted) {
    return "VISITOR_WAITLISTED";
  }
  if (prDetail.value.partnerSection.viewer.canWaitlist) {
    return "VISITOR_WAITLISTABLE";
  }
  return prDetail.value.partnerSection.viewer.canJoin
    ? "VISITOR_JOINABLE"
    : "VISITOR_BLOCKED";
});

const dockActions = computed<DockActionItem[]>(() => {
  if (!prDetail.value) return [];

  const viewer = prDetail.value.partnerSection.viewer;
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
const joinFlowComponent = computed(() =>
  joinDockAction.value?.key === "WAITLIST" ? PRWaitlistFlow : PRJoinFlow,
);
const nonJoinPrimaryDockAction = computed(() =>
  primaryDockAction.value &&
  primaryDockAction.value.key !== "JOIN" &&
  primaryDockAction.value.key !== "WAITLIST"
    ? primaryDockAction.value
    : null,
);

const primaryBlockedMessage = computed(() => {
  const viewer = prDetail.value?.partnerSection.viewer;
  if (
    !viewer ||
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
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer?.isWaitlisted) return null;
  if (viewer.waitlistRank !== null) {
    return t("prPage.waitlistRankNotice", { rank: viewer.waitlistRank });
  }
  return t("prPage.waitlistedNotice");
});

const showReminderSubscriptions = computed(() => {
  const section = prDetail.value?.partnerSection;
  if (!section?.reminder.supported) return false;
  return section.viewer.isParticipant;
});

const showInlineReminderSubscriptions = computed(
  () => showReminderSubscriptions.value,
);

const showMessageThread = computed(
  () =>
    supportsEventContextFeatures.value &&
    (prDetail.value?.partnerSection.viewer.isParticipant ?? false),
);

const showBookingSupportEntry = computed(
  () => supportsEventContextFeatures.value,
);
const showEventPlazaLink = computed(() => supportsEventContextFeatures.value);

const showExitActionInContext = computed(() => {
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer?.isParticipant) return false;
  return true;
});

const showCancelWaitlistActionInContext = computed(
  () => prDetail.value?.partnerSection.viewer.isWaitlisted ?? false,
);

const showContextualActionArea = computed(() =>
  Boolean(
    releaseNoticeText.value ||
      primaryBlockedMessage.value ||
      waitlistNoticeText.value ||
      primaryDockAction.value ||
      showCancelWaitlistActionInContext.value ||
      showExitActionInContext.value ||
      primaryActionErrorMessage.value,
  ),
);

watch(
  () =>
    [
      id.value,
      primaryDockAction.value?.key ?? null,
      viewerState.value,
    ] as const,
  ([prId, actionKey, state]) => {
    if (
      prId === null ||
      actionKey === null ||
      !supportsEventContextFeatures.value
    ) {
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

const exitBlockedTip = computed(() => {
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer || viewer.canExit) return null;
  return blockedReasonText(viewer.exitBlockedReason);
});

watch(
  [() => matchedPRHandoff.state.phase, id, () => prDetail.value?.id ?? null],
  async () => {
    await nextTick();
    registerFactsCardTarget();
  },
  { immediate: true },
);

const handlePublishDraft = async () => {
  if (id.value === null || prDetail.value?.status !== "DRAFT") return;
  const result = await publishMutation.mutateAsync({ id: id.value });
  const authPayload = (result as { auth?: AuthSessionPayload | null } | null)
    ?.auth;
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }
  await router.replace({ query: { ...route.query, entry: "publish" } });
  await refetch();
};

const handleConfirmWithBookingContact = async () => {
  bookingContactActionError.value = null;

  try {
    await attendanceActions.handleConfirmSlot();
  } catch (error) {
    bookingContactActionError.value =
      error instanceof Error ? error.message : t("errors.confirmSlotFailed");
  }
};

const openJoinFlow = async (): Promise<void> => {
  bookingContactActionError.value = null;
  await nextTick();
  await joinFlowRef.value?.open();
};

const handleJoinFlowJoined = (): void => {
  resetLivePolling();
  void refetch();
};

const pendingActionReplayRunning = ref(false);

const matchPendingActionForCurrentPR = (
  pending: PendingWeChatAction | null,
): PendingWeChatAction | null => {
  if (!pending || id.value === null) {
    return null;
  }
  if (
    pending.kind === "PR_JOIN" ||
    pending.kind === "PR_WAITLIST" ||
    pending.kind === "PR_EXIT" ||
    pending.kind === "PR_CONFIRM" ||
    pending.kind === "PR_PUBLISH"
  ) {
    return pending.prId === id.value ? pending : null;
  }
  return null;
};

const attemptPendingWeChatActionReplay = async () => {
  if (pendingActionReplayRunning.value) return;
  if (id.value === null || !currentDetail.value) return;

  const pending = matchPendingActionForCurrentPR(readPendingWeChatAction());
  if (!pending) return;

  pendingActionReplayRunning.value = true;
  clearPendingWeChatAction();
  try {
    if (pending.kind === "PR_JOIN") {
      const viewer = currentDetail.value.partnerSection.viewer;
      if (viewer.isParticipant || !viewer.canJoin) return;
      await openJoinFlow();
      return;
    }

    if (pending.kind === "PR_WAITLIST") {
      const viewer = currentDetail.value.partnerSection.viewer;
      if (viewer.isParticipant || viewer.isWaitlisted || !viewer.canWaitlist) {
        return;
      }
      await openJoinFlow();
      return;
    }

    if (pending.kind === "PR_EXIT") {
      if (!sharedActions.canExit.value) return;
      await sharedActions.handleExit();
      return;
    }

    if (pending.kind === "PR_PUBLISH") {
      if (currentDetail.value.status !== "DRAFT" || id.value === null) return;
      const result = await publishMutation.mutateAsync({ id: id.value });
      const authPayload = (result as { auth?: AuthSessionPayload | null } | null)
        ?.auth;
      if (authPayload) {
        userSessionStore.applyAuthSession(authPayload);
      }
      await router.replace({ query: { ...route.query, entry: "publish" } });
      await refetch();
      return;
    }

    if (!attendanceActions.canConfirm.value) return;
    await handleConfirmWithBookingContact();
  } catch (error) {
    if (pending.kind === "PR_EXIT") {
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
      prDetail.value?.partnerSection.viewer.isWaitlisted,
      prDetail.value?.partnerSection.viewer.canJoin,
      prDetail.value?.partnerSection.viewer.canWaitlist,
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

const trackPrimaryActionClick = (action: DockActionItem): void => {
  const ctaType = mapDockActionToTrackType(action.key);
  if (id.value !== null) {
    if (ctaType !== null && supportsEventContextFeatures.value) {
      trackEvent("pr_primary_cta_click", {
        prId: id.value,
        ctaType,
        viewerState: viewerState.value,
      });
    }
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
    return;
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
  if (id.value === null) return;
  try {
    await cancelWaitlistMutation.mutateAsync({ id: id.value });
    showCancelWaitlistConfirmModal.value = false;
    resetLivePolling();
    void refetch();
  } catch (error) {
    cancelWaitlistActionError.value =
      error instanceof Error ? error.message : t("errors.cancelWaitlistFailed");
  }
};

const goBookingSupport = () => {
  if (id.value === null || !supportsEventContextFeatures.value) return;
  router.push(prBookingSupportPath(id.value));
};

const handleOpenMessages = () => {
  if (id.value === null || !supportsEventContextFeatures.value) return;
  router.push(prMessagesPath(id.value));
};

const handleEditSuccess = () => {
  showEditModal.value = false;
};
const handleOpenCreatorEdit = () => {
  if (id.value !== null && supportsEventContextFeatures.value) {
    trackEvent("pr_secondary_action_click", {
      prId: id.value,
      actionType: "CREATOR_EDIT_CONTENT",
    });
  }
  showEditModal.value = true;
};
const handleOpenCreatorModifyStatus = () => {
  if (id.value !== null && supportsEventContextFeatures.value) {
    trackEvent("pr_secondary_action_click", {
      prId: id.value,
      actionType: "CREATOR_MODIFY_STATUS",
    });
  }
  showModifyModal.value = true;
};

function mapDockActionToTrackType(
  key: DockActionKey,
): "JOIN" | "WAITLIST" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT" | null {
  if (key === "JOIN") return "JOIN";
  if (key === "WAITLIST") return "WAITLIST";
  if (key === "CONFIRM") return "CONFIRM_SLOT";
  if (key === "CHECKIN_ATTENDED") return "CHECK_IN";
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
.header-quick-actions {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
}

.type-badge {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.facts-card {
  margin-top: var(--sys-spacing-large);
}

.facts-card--handoff-hidden {
  visibility: hidden;
}

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

.secondary-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.secondary-danger-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.utility-area {
  margin-top: var(--sys-spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
}

.utility-actions,
.utility-action-group,
.utility-section__content {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.utility-section__title {
  margin: 0;
  @include mx.pu-font(body-large);
}

.utility-link-row {
  display: flex;
  justify-content: flex-end;
}

.utility-link {
  @include mx.pu-font(body-medium);
  display: inline-flex;
  align-items: center;
  color: var(--sys-color-secondary);
  text-decoration: none;
  transition:
    color 180ms ease,
    transform 180ms ease;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.utility-link__icon {
  margin-left: var(--sys-spacing-xsmall);
  display: inline-block;
  vertical-align: middle;
  @include mx.pu-icon(medium);
}

@media (hover: hover) and (pointer: fine) {
  .utility-link:hover {
    transform: translateX(2px);
    color: var(--sys-color-primary);
  }
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

@media (max-width: 375px) {
  .header-quick-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
