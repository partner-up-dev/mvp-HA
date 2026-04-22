<template>
  <PageScaffold class="pr-page" data-page="pr-detail">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <PageHeader
        :title="prDetail.title ?? t('prPage.metaFallbackTitle')"
        :back-fallback-to="backFallbackTo"
        data-region="summary"
      >
        <template #top-actions>
          <div v-if="isCreator" class="header-quick-actions">
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
        v-if="showPinHelpCard"
        tone="info"
        :message="
          userSessionStore.userPin
            ? t('prPage.pinHelp.currentPin', { pin: userSessionStore.userPin })
            : t('prPage.pinHelp.description')
        "
      />

      <AnchorPRFactsCard
        class="facts-card"
        :pr-id="prDetail.id"
        :location="prDetail.core.location ?? null"
        :time-text="localizedTimeText"
        :preferences="prDetail.core.preferences"
        :notes="prDetail.core.notes ?? null"
        :participant-overview-text="participantOverviewText"
        :roster-preview="rosterPreview"
        :has-more-roster="hasMoreRoster"
        :location-gallery-available="locationGallery.length > 0"
        @view-location-gallery="showLocationGalleryModal = true"
        @view-roster="showRosterModal = true"
        data-region="summary"
      />

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

        <div v-if="primaryDockAction" class="primary-action">
          <Button
            class="primary-action__button"
            :tone="buttonToneForAction(primaryDockAction)"
            :disabled="primaryDockAction.disabled"
            :loading="primaryDockAction.pending"
            block
            @click="handleDockAction(primaryDockAction)"
          >
            {{
              primaryDockAction.pending
                ? primaryDockAction.pendingLabel
                : primaryDockAction.label
            }}
          </Button>
          <p v-if="primaryDockAction.tip" class="action-tip">
            {{ primaryDockAction.tip }}
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

        <AnchorPRRecoveryLane
          v-if="showRecoveryLane"
          :pr-id="id"
          :section="prDetail.partnerSection"
          :accept-alternative-batch-pending="
            isAnchorPR ? acceptAlternativeBatchMutation.isPending.value : false
          "
          @accept-alternative-batch="handleAcceptAlternativeBatch"
        />
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

      <AnchorPRRosterModal
        :open="showRosterModal"
        :pr-id="prDetail.id"
        :section="prDetail.partnerSection"
        @close="showRosterModal = false"
      />

      <EditPRContentModal
        v-if="showEditModal && id !== null"
        :open="showEditModal"
        :initial-fields="editableFields"
        :pr-id="id"
        :scenario="prScenario"
        @close="showEditModal = false"
        @success="handleEditSuccess"
      />

      <UpdatePRStatusModal
        v-if="id !== null"
        :open="showModifyModal"
        :pr-id="id"
        :scenario="prScenario"
        @close="showModifyModal = false"
      />

      <PRLocationGalleryModal
        :open="showLocationGalleryModal"
        :images="locationGallery"
        @close="showLocationGalleryModal = false"
      />

      <Modal
        :open="showJoinSubscriptionModal"
        @close="closeJoinSuccessNotificationPrompt"
      >
        <div class="notification-modal">
          <p class="modal-text modal-text--tight">
            {{ t("prPage.joinSuccessSubscriptions.description") }}
          </p>

          <WeChatNotificationSubscriptionsCard
            :title="t('prPage.notificationSubscriptions.title')"
          >
            <APRNotificationSubscriptions
              :updating-label="t('prPage.wechatReminder.updating')"
              outline-profile="surface"
            />
          </WeChatNotificationSubscriptionsCard>

          <Button
            tone="surface"
            block
            @click="closeJoinSuccessNotificationPrompt"
          >
            {{ t("prPage.joinSuccessSubscriptions.closeAction") }}
          </Button>
        </div>
      </Modal>

      <Modal
        :open="showJoinFlowModal"
        title="加入活动"
        @close="closeJoinFlowModal"
      >
        <template v-if="joinFlowStep === 'SUMMARY'">
          <p class="modal-text">确认加入当前活动？</p>
          <p class="modal-text">加入后即可按流程完成确认与签到。</p>
          <div class="modal-actions">
            <Button
              tone="surface"
              type="button"
              @click="closeJoinFlowModal"
            >
              {{ t("common.cancel") }}
            </Button>
            <Button
              type="button"
              :disabled="joinFlowPending"
              @click="continueJoinFlow"
            >
              {{ joinFlowPending ? t("prPage.joining") : t("common.confirm") }}
            </Button>
          </div>
        </template>

        <template v-else>
          <div class="join-phone-step">
            <p class="modal-text">
              {{ t("prPage.bookingContact.joinFlowPrompt") }}
            </p>
            <input
              v-model.trim="joinFlowPhoneInput"
              class="modal-phone-input"
              type="tel"
              inputmode="numeric"
              maxlength="11"
              placeholder="请输入 11 位大陆手机号"
            />
            <div class="modal-actions">
              <Button
                tone="surface"
                type="button"
                @click="closeJoinFlowModal"
              >
                {{ t("common.cancel") }}
              </Button>
              <Button
                type="button"
                :disabled="joinFlowPending"
                @click="submitJoinFlowPhoneAndJoin"
              >
                {{
                  joinFlowPending
                    ? t("prPage.joining")
                    : t("prPage.bookingContact.joinFlowSubmit")
                }}
              </Button>
            </div>
          </div>
        </template>
        <p v-if="joinFlowError" class="action-error">{{ joinFlowError }}</p>
      </Modal>

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
            tone="secondary"
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
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import ConfirmDialog from "@/shared/ui/overlay/ConfirmDialog.vue";
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";
import Button from "@/shared/ui/actions/Button.vue";
import PRLocationGalleryModal from "@/domains/pr/ui/modals/PRLocationGalleryModal.vue";
import AnchorPRRosterModal from "@/domains/pr/ui/modals/AnchorPRRosterModal.vue";
import EditPRContentModal from "@/domains/pr/ui/modals/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/domains/pr/ui/modals/UpdatePRStatusModal.vue";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import WeChatNotificationSubscriptionsCard from "@/shared/ui/sections/WeChatNotificationSubscriptionsCard.vue";
import MiniumCommonFooter from "@/domains/support/ui/sections/MiniumCommonFooter.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";
import PRShareSection from "@/domains/pr/ui/sections/PRShareSection.vue";
import AnchorPRRecoveryLane from "@/domains/pr/ui/sections/AnchorPRRecoveryLane.vue";
import AnchorPRFactsCard from "@/domains/pr/ui/composites/AnchorPRFactsCard.vue";
import {
  useAcceptAnchorAlternativeBatch,
  useJoinAnchorPR,
} from "@/domains/pr/queries/useAnchorPR";
import { usePublishCommunityPR } from "@/domains/pr/queries/useCommunityPR";
import { usePRDetail, type PRDetailResponse } from "@/domains/pr/queries/usePRDetail";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { usePRDetailHead } from "@/domains/pr/use-cases/usePRDetailHead";
import { usePRRouteShareDescriptor } from "@/domains/pr/use-cases/usePRRouteShareDescriptor";
import { useSharedPRActions } from "@/domains/pr/use-cases/useSharedPRActions";
import { useAnchorAttendanceActions } from "@/domains/pr/use-cases/useAnchorAttendanceActions";
import { usePRLivePolling } from "@/domains/pr/use-cases/usePRLivePolling";
import { usePRLocationGallery } from "@/domains/pr/use-cases/usePRLocationGallery";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import { useJoinSuccessNotificationPrompt } from "@/domains/notification/use-cases/useJoinSuccessNotificationPrompt";
import { useRouteShareDescriptorRegistration } from "@/domains/share/use-cases/route-share-controller";
import {
  anchorPRBookingSupportPath,
  anchorPRMessagesPath,
  prDetailPath,
} from "@/domains/pr/routing/routes";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import {
  isAnchorPRDetail,
  isCommunityPRDetail,
  type PRFormFields,
} from "@/domains/pr/model/types";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import { trackEvent } from "@/shared/telemetry/track";
import type { ApiError } from "@/shared/api/error";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  type PendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";

type BlockedReason =
  PRDetailResponse["partnerSection"]["viewer"]["joinBlockedReason"];
type RosterState =
  PRDetailResponse["partnerSection"]["roster"][number]["state"];

type DockActionKey = "JOIN" | "CONFIRM" | "CHECKIN_ATTENDED";

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

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();
const BOOKING_CONTACT_PHONE_REQUIRED_CODE = "BOOKING_CONTACT_PHONE_REQUIRED";
const CN_MAINLAND_MOBILE_REGEX = /^1\d{10}$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const FACTS_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s(.+)$/;
const userSessionStore = useUserSessionStore();

const extractFactsTimeDatePart = (formatted: string | null): string | null => {
  if (!formatted) {
    return null;
  }

  const matched = formatted.match(FACTS_TIME_PATTERN);
  if (!matched) {
    return null;
  }

  return `${matched[1]}-${matched[2]}-${matched[3]}`;
};

const resolveRelativeDayLabelByDate = (
  year: number,
  month: number,
  day: number,
): "今天" | "明天" | "后天" | null => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const targetStart = new Date(year, month - 1, day);
  if (Number.isNaN(targetStart.getTime())) {
    return null;
  }

  const diffDays = Math.round(
    (targetStart.getTime() - todayStart.getTime()) / DAY_IN_MS,
  );
  if (diffDays === 0) {
    return "今天";
  }

  if (diffDays === 1) {
    return "明天";
  }

  if (diffDays === 2) {
    return "后天";
  }

  return null;
};

const formatFactsTimePoint = (
  formatted: string | null,
  includeRelativeDayLabel: boolean,
): string | null => {
  if (!formatted || !includeRelativeDayLabel) {
    return formatted;
  }

  const matched = formatted.match(FACTS_TIME_PATTERN);
  if (!matched) {
    return formatted;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const timePart = matched[4];
  const relativeDayLabel = resolveRelativeDayLabelByDate(year, month, day);
  if (!relativeDayLabel) {
    return formatted;
  }

  const datePart = `${matched[1]}-${matched[2]}-${matched[3]}`;
  return `${datePart} (${relativeDayLabel}) ${timePart}`;
};

const { data, isLoading, error, refetch } = usePRDetail(id);
const prDetail = computed(() => data.value);
const anchorDetail = computed(() =>
  prDetail.value && isAnchorPRDetail(prDetail.value) ? prDetail.value : undefined,
);
const isAnchorPR = computed(() => Boolean(anchorDetail.value));
const isCommunityPR = computed(
  () => Boolean(prDetail.value && isCommunityPRDetail(prDetail.value)),
);
const backFallbackTo = computed(() => {
  const routeEventIdRaw = route.query.fromEvent;
  const routeEventId =
    typeof routeEventIdRaw === "string" ? Number(routeEventIdRaw) : null;
  if (routeEventId !== null && Number.isFinite(routeEventId) && routeEventId > 0) {
    return `/events/${routeEventId}`;
  }

  const anchorEventId = anchorDetail.value?.anchor.anchorEventId ?? null;
  if (
    anchorEventId !== null &&
    Number.isFinite(anchorEventId) &&
    anchorEventId > 0
  ) {
    return `/events/${anchorEventId}`;
  }
  return "/";
});
const joinMutation = useJoinAnchorPR();
const acceptAlternativeBatchMutation = useAcceptAnchorAlternativeBatch();
const publishMutation = usePublishCommunityPR();
const showEditModal = ref(false);
const showModifyModal = ref(false);
const showLocationGalleryModal = ref(false);
const showRosterModal = ref(false);
const showJoinFlowModal = ref(false);
const showExitConfirmModal = ref(false);
const showShareDrawer = ref(false);
const {
  isOpen: showJoinSubscriptionModal,
  open: openJoinSuccessNotificationPrompt,
  close: closeJoinSuccessNotificationPrompt,
} = useJoinSuccessNotificationPrompt();
const joinFlowStep = ref<"SUMMARY" | "PHONE_INPUT">("SUMMARY");
const joinFlowPending = ref(false);
const joinFlowError = ref<string | null>(null);
const bookingContactActionError = ref<string | null>(null);
const joinFlowPhoneInput = ref("");
const exitActionError = ref<string | null>(null);
const lastPrimaryImpressionKey = ref("");

const prScenario = computed(() =>
  prDetail.value?.prKind === "ANCHOR" ? "ANCHOR" : "COMMUNITY",
);

const editableFields = computed<PRFormFields>(() => ({
  title: prDetail.value?.title,
  type: prDetail.value?.core.type ?? "",
  time: prDetail.value?.core.time ?? [null, null],
  location: prDetail.value?.core.location ?? null,
  minPartners: prDetail.value?.core.minPartners ?? null,
  maxPartners: prDetail.value?.core.maxPartners ?? null,
  partners: prDetail.value?.core.partners ?? [],
  budget:
    prDetail.value && isCommunityPRDetail(prDetail.value)
      ? prDetail.value.core.budget ?? null
      : undefined,
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
  onActionSuccess: resetLivePolling,
});
const attendanceActions = useAnchorAttendanceActions({
  id,
  pr: anchorDetail,
  onActionSuccess: resetLivePolling,
});
const creationEntry = computed(() => {
  const raw = route.query.entry;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
});
const showDraftPublishCard = computed(
  () => isCommunityPR.value && prDetail.value?.status === "DRAFT",
);
const showPinHelpCard = computed(() => {
  if (!isCommunityPR.value) return false;
  if (creationEntry.value === "join") {
    return Boolean(userSessionStore.userPin);
  }
  if (!isCreator.value) return false;
  return creationEntry.value === "create" || creationEntry.value === "publish";
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

useBodyScrollLock(
  computed(
    () =>
      showEditModal.value ||
      showModifyModal.value ||
      showLocationGalleryModal.value ||
      showRosterModal.value ||
      showJoinSubscriptionModal.value ||
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
const routeShareDescriptor = usePRRouteShareDescriptor({
  id,
  pr: prDetail,
  spmRouteKey,
});
usePRDetailHead({ pr: prDetail, shareUrl });
useRouteShareDescriptorRegistration(routeShareDescriptor);

const localizedTimeText = computed(() => {
  const [startRaw, endRaw] = prDetail.value?.core.time ?? [null, null];
  const startBase = formatLocalDateTimeValue(startRaw);
  const endBase = formatLocalDateTimeValue(endRaw);
  const sameDay =
    extractFactsTimeDatePart(startBase) !== null &&
    extractFactsTimeDatePart(startBase) === extractFactsTimeDatePart(endBase);
  const start = formatFactsTimePoint(startBase, true);
  const end = formatFactsTimePoint(endBase, !sameDay);

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

const isActiveRosterState = (state: RosterState): boolean =>
  state === "JOINED" || state === "CONFIRMED" || state === "ATTENDED";

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

const showRecoveryLane = computed(() => {
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer) return false;
  return isAnchorPR.value && !viewer.isParticipant && !viewer.canJoin;
});

const activeRoster = computed(
  () =>
    prDetail.value?.partnerSection.roster.filter((item) =>
      isActiveRosterState(item.state),
    ) ?? [],
);
const rosterPreview = computed(() => activeRoster.value.slice(0, 4));
const hasMoreRoster = computed(
  () => activeRoster.value.length > rosterPreview.value.length,
);

const viewerState = computed<ViewerState>(() => {
  if (!prDetail.value) return "VISITOR_BLOCKED";
  if (prDetail.value.partnerSection.viewer.isParticipant) return "PARTICIPANT";
  if (prDetail.value.partnerSection.viewer.isCreator) return "CREATOR";
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
    if (!viewer.canJoin) return [];
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
    ];
  }

  return [];
});

const primaryDockAction = computed(() => dockActions.value[0] ?? null);

const primaryBlockedMessage = computed(() => {
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer || viewer.isParticipant || viewer.canJoin) return null;
  return blockedReasonText(viewer.joinBlockedReason);
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
    isAnchorPR.value &&
    (prDetail.value?.partnerSection.viewer.isParticipant ?? false),
);

const showBookingSupportEntry = computed(() => isAnchorPR.value);
const showEventPlazaLink = computed(() => isAnchorPR.value);

const showExitActionInContext = computed(() => {
  const viewer = prDetail.value?.partnerSection.viewer;
  if (!viewer?.isParticipant) return false;
  return true;
});

const showContextualActionArea = computed(() =>
  Boolean(
    releaseNoticeText.value ||
    primaryBlockedMessage.value ||
    primaryDockAction.value ||
    showExitActionInContext.value ||
    primaryActionErrorMessage.value ||
    showRecoveryLane.value,
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
    if (prId === null || actionKey === null || !isAnchorPR.value) return;
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

const validateJoinFlowPhoneInput = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "请输入手机号";
  }
  if (!CN_MAINLAND_MOBILE_REGEX.test(trimmed)) {
    return "请输入 11 位大陆手机号";
  }
  return null;
};

const closeJoinFlowModal = () => {
  showJoinFlowModal.value = false;
  joinFlowStep.value = "SUMMARY";
  joinFlowPhoneInput.value = "";
  joinFlowPending.value = false;
  joinFlowError.value = null;
};

const openJoinFlowModal = () => {
  bookingContactActionError.value = null;
  joinFlowError.value = null;
  joinFlowPending.value = false;
  joinFlowStep.value = "SUMMARY";
  joinFlowPhoneInput.value = "";
  showJoinFlowModal.value = true;
};

const finalizeJoinFlow = async (bookingContactPhone?: string | null) => {
  joinFlowPending.value = true;
  joinFlowError.value = null;
  bookingContactActionError.value = null;
  const result = await sharedActions.handleJoin({ bookingContactPhone });
  joinFlowPending.value = false;
  if (result) {
    closeJoinFlowModal();
    openJoinSuccessNotificationPrompt();
    return;
  }
  joinFlowError.value =
    primaryActionErrorMessage.value ?? t("errors.joinRequestFailed");
};

const continueJoinFlow = async () => {
  if (joinFlowPending.value) return;
  if (joinFlowNeedsBookingContact.value) {
    joinFlowStep.value = "PHONE_INPUT";
    return;
  }
  await finalizeJoinFlow();
};

const submitJoinFlowPhoneAndJoin = async () => {
  if (joinFlowPending.value) return;
  const phoneInputError = validateJoinFlowPhoneInput(joinFlowPhoneInput.value);
  if (phoneInputError) {
    joinFlowError.value = phoneInputError;
    return;
  }
  await finalizeJoinFlow(joinFlowPhoneInput.value.trim());
};

const handleDirectJoin = async () => {
  const result = await sharedActions.handleJoin();
  const authPayload = (result as { auth?: AuthSessionPayload | null } | null)
    ?.auth;
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }
  if (authPayload?.userPin) {
    await router.replace({ query: { ...route.query, entry: "join" } });
  }
};

const handlePublishDraft = async () => {
  if (id.value === null || !isCommunityPR.value) return;
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
  if (id.value === null || !anchorDetail.value) return;

  const pending = matchPendingActionForCurrentPR(readPendingWeChatAction());
  if (!pending) return;

  pendingActionReplayRunning.value = true;
  clearPendingWeChatAction();
  try {
    if (pending.kind === "ANCHOR_PR_JOIN") {
      const viewer = anchorDetail.value.partnerSection.viewer;
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
  if (id.value === null || !isAnchorPR.value) return;
  const result = await acceptAlternativeBatchMutation.mutateAsync({
    id: id.value,
    targetTimeWindow,
  });
  try {
    await joinMutation.mutateAsync({ id: result.prId as PRId });
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === BOOKING_CONTACT_PHONE_REQUIRED_CODE) {
      bookingContactActionError.value = t(
        "prPage.bookingContact.ownerVerifyBeforeJoin",
      );
    } else {
      bookingContactActionError.value =
        apiError.message ?? t("errors.joinRequestFailed");
    }
  }
  await router.push(prDetailPath(result.prId as PRId));
};

const handleDockAction = async (action: DockActionItem) => {
  if (action.disabled || action.pending) return;
  const ctaType = mapDockActionToTrackType(action.key);
  if (id.value !== null) {
    if (ctaType !== null && isAnchorPR.value) {
      trackEvent("anchor_pr_primary_cta_click", {
        prId: id.value,
        prKind: "ANCHOR",
        ctaType,
        viewerState: viewerState.value,
      });
    }
  }

  if (action.key === "JOIN") {
    if (isAnchorPR.value) {
      openJoinFlowModal();
      return;
    }
    await handleDirectJoin();
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

const goBookingSupport = () => {
  if (id.value === null || !isAnchorPR.value) return;
  router.push(anchorPRBookingSupportPath(id.value));
};

const handleOpenMessages = () => {
  if (id.value === null || !isAnchorPR.value) return;
  router.push(anchorPRMessagesPath(id.value));
};

const handleEditSuccess = () => {
  showEditModal.value = false;
};
const handleOpenCreatorEdit = () => {
  if (id.value !== null && isAnchorPR.value) {
      trackEvent("anchor_pr_secondary_action_click", {
      prId: id.value,
      prKind: "ANCHOR",
      actionType: "CREATOR_EDIT_CONTENT",
    });
  }
  showEditModal.value = true;
};
const handleOpenCreatorModifyStatus = () => {
  if (id.value !== null && isAnchorPR.value) {
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
): "primary" | "secondary" | "surface" | "danger" | "outline" | "ghost" {
  if (action.tone === "surface") return "surface";
  if (action.tone === "secondary") return "secondary";
  if (action.tone === "danger") return "danger";
  return "primary";
}
</script>

<style lang="scss" scoped>
.header-quick-actions {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xs);
}

.type-badge {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.facts-card {
  margin-top: var(--sys-spacing-lg);
}

.contextual-area {
  margin-top: var(--sys-spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.primary-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.primary-action__button {
  max-width: 100%;
}

.secondary-danger-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.utility-area {
  margin-top: var(--sys-spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-lg);
}

.utility-actions,
.utility-action-group,
.utility-section__content {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
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
  margin-left: var(--sys-spacing-xs);
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
  margin-top: var(--sys-spacing-sm);
}

.modal-text {
  margin: 0 0 var(--sys-spacing-sm);
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.modal-text--tight {
  margin-bottom: 0;
}

.notification-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.modal-phone-input {
  width: 100%;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  @include mx.pu-font(body-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.join-phone-step {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.join-phone-step .modal-text {
  margin: 0;
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

@media (max-width: 375px) {
  .header-quick-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
