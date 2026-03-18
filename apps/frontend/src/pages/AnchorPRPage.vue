<template>
  <PageScaffold class="anchor-pr-page">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <PRHeroHeader
        :title="prDetail.title"
        :status="prDetail.status"
        :created-at-label="formatDate(prDetail.createdAt)"
        @back="goHome"
      />

      <PRFactsCard
        :type="prDetail.core.type"
        :time="localizedTime"
        :location="prDetail.core.location"
        :min-partners="prDetail.core.minPartners"
        :max-partners="prDetail.core.maxPartners"
        :partners="prDetail.core.partners"
        :show-partners="false"
        :preferences="prDetail.core.preferences"
        :notes="prDetail.core.notes"
      >
        <template #location-extra>
          <button
            v-if="locationGallery.length > 0"
            class="location-gallery-link"
            type="button"
            @click="showLocationGalleryModal = true"
          >
            {{ t("prCard.viewLocationImages") }}
          </button>
        </template>
      </PRFactsCard>

      <AnchorPRPrimaryActionLane
        :pr-id="id"
        :section="prDetail.partnerSection"
        :slot-state-text="sharedActions.slotStateText.value"
        :join-pending="sharedActions.joinPending.value"
        :join-error-message="primaryActionErrorMessage"
        :exit-pending="sharedActions.exitPending.value"
        :confirm-pending="attendanceActions.confirmPending.value"
        :check-in-pending="attendanceActions.checkInPending.value"
        @go-recovery="scrollToRecoveryLane"
        @join="handleJoinWithBookingContact"
        @exit="sharedActions.handleExit"
        @confirm-slot="handleConfirmWithBookingContact"
        @prepare-check-in="attendanceActions.prepareCheckIn"
      />

      <AnchorPRNextStepLane
        :section="prDetail.partnerSection"
        :show-check-in-followup="attendanceActions.showCheckInFollowup.value"
        :check-in-followup-status-label="
          attendanceActions.checkInFollowupStatusLabel.value
        "
        :check-in-pending="attendanceActions.checkInPending.value"
        :can-toggle-reminder="reminder.canToggleReminder.value"
        :reminder-enabled="reminder.reminderEnabled.value"
        :reminder-toggle-pending="reminder.reminderTogglePending.value"
        :reminder-authenticated="reminder.reminderAuthenticated.value"
        :reminder-configured="reminder.reminderConfigured.value"
        :reminder-hint-text="reminder.reminderHintText.value"
        :is-we-chat-env="isWeChatEnv"
        @submit-check-in="attendanceActions.submitCheckIn"
        @cancel-check-in="attendanceActions.cancelPendingCheckIn"
        @toggle-reminder="reminder.handleToggleWechatReminder"
        @go-wechat-login="reminder.handleGoWechatLogin"
      />

      <section class="section-card">
        <router-link
          v-if="id !== null"
          :to="anchorPRBookingSupportPath(id)"
          class="booking-support-entry-card"
        >
          <div class="booking-support-entry-card__header">
            <h2 class="section-title">{{ t("prPage.bookingSupportEntry.title") }}</h2>
            <span class="booking-support-entry-card__action">{{
              t("prPage.bookingSupportEntry.viewAction")
            }}</span>
          </div>
          <p class="section-description">{{ bookingSupportSummaryHeadline }}</p>
          <p class="section-description">{{ bookingSupportSummaryDeadline }}</p>
          <p
            v-for="highlight in bookingSupportHighlights"
            :key="highlight"
            class="section-description"
          >
            {{ highlight }}
          </p>
        </router-link>
      </section>

      <AnchorPRAwarenessLane
        :pr-id="prDetail.id"
        :section="prDetail.partnerSection"
      />

      <AnchorPRRecoveryLane
        ref="recoveryLaneRef"
        :pr-id="id"
        :section="prDetail.partnerSection"
        :accept-alternative-batch-pending="
          acceptAlternativeBatchMutation.isPending.value
        "
        @accept-alternative-batch="handleAcceptAlternativeBatch"
      />

      <AnchorPRActionsBar
        v-if="
          sharedActions.showEditContentAction.value ||
          sharedActions.showModifyStatusAction.value
        "
        :can-join="false"
        :can-exit="false"
        :has-joined="false"
        :is-creator="isCreator"
        :can-confirm="false"
        :can-check-in="false"
        :show-edit-content-action="sharedActions.showEditContentAction.value"
        :show-modify-status-action="sharedActions.showModifyStatusAction.value"
        :show-check-in-followup="false"
        check-in-followup-status-label=""
        slot-state-text=""
        :join-pending="false"
        :exit-pending="false"
        :confirm-pending="false"
        :check-in-pending="false"
        @edit-content="handleOpenCreatorEdit"
        @modify-status="handleOpenCreatorModifyStatus"
      />

      <PRShareSection
        :pr-id="id"
        :share-url="shareUrl"
        :spm-route-key="spmRouteKey"
        :pr-data="prShareData"
      />

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
    </template>

    <ContactSupportFooter />
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PRFactsCard from "@/domains/pr/ui/composites/PRFactsCard.vue";
import PRLocationGalleryModal from "@/domains/pr/ui/modals/PRLocationGalleryModal.vue";
import EditPRContentModal from "@/domains/pr/ui/modals/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/domains/pr/ui/modals/UpdatePRStatusModal.vue";
import ContactSupportFooter from "@/domains/support/ui/sections/ContactSupportFooter.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import PRHeroHeader from "@/domains/pr/ui/composites/PRHeroHeader.vue";
import PRShareSection from "@/domains/pr/ui/sections/PRShareSection.vue";
import AnchorPRActionsBar from "@/domains/pr/ui/sections/AnchorPRActionsBar.vue";
import AnchorPRPrimaryActionLane from "@/domains/pr/ui/sections/AnchorPRPrimaryActionLane.vue";
import AnchorPRNextStepLane from "@/domains/pr/ui/sections/AnchorPRNextStepLane.vue";
import AnchorPRAwarenessLane from "@/domains/pr/ui/sections/AnchorPRAwarenessLane.vue";
import AnchorPRRecoveryLane from "@/domains/pr/ui/sections/AnchorPRRecoveryLane.vue";
import {
  useAcceptAnchorAlternativeBatch,
  useAnchorPR,
  useJoinAnchorPR,
  useVerifyAnchorPRBookingContact,
} from "@/domains/pr/queries/useAnchorPR";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { usePRDetailHead } from "@/domains/pr/use-cases/usePRDetailHead";
import { useSharedPRActions } from "@/domains/pr/use-cases/useSharedPRActions";
import { useAnchorAttendanceActions } from "@/domains/pr/use-cases/useAnchorAttendanceActions";
import { usePRLivePolling } from "@/domains/pr/use-cases/usePRLivePolling";
import { usePRLocationGallery } from "@/domains/pr/use-cases/usePRLocationGallery";
import { usePRReminderSubscription } from "@/domains/pr/use-cases/usePRReminderSubscription";
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

const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();
const BOOKING_CONTACT_OWNER_REQUIRED_CODE = "BOOKING_CONTACT_OWNER_REQUIRED";
const BOOKING_CONTACT_REQUIRED_CODE = "BOOKING_CONTACT_REQUIRED";

const { data, isLoading, error, refetch } = useAnchorPR(id);
const prDetail = computed(() => data.value);
const joinMutation = useJoinAnchorPR();
const verifyBookingContactMutation = useVerifyAnchorPRBookingContact();
const acceptAlternativeBatchMutation = useAcceptAnchorAlternativeBatch();
const userSessionStore = useUserSessionStore();
const { requestPhoneCredential } = useWeChatPhoneCredential();
const showEditModal = ref(false);
const showModifyModal = ref(false);
const showLocationGalleryModal = ref(false);
const bookingContactActionError = ref<string | null>(null);
const recoveryLaneRef = ref<{ scrollIntoView: () => void } | null>(null);

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

useBodyScrollLock(
  computed(
    () =>
      showEditModal.value ||
      showModifyModal.value ||
      showLocationGalleryModal.value,
  ),
);

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

const {
  isWeChatEnv,
  ...reminder
} = usePRReminderSubscription(id);

const { shareUrl, spmRouteKey, prShareData } = usePRShareContext({
  id,
  pr: prDetail,
});
usePRDetailHead({ pr: prDetail, shareUrl });

const formatDate = (dateStr: string) =>
  formatLocalDateTimeValue(dateStr) ?? dateStr;
const localizedTime = computed<[string | null, string | null]>(() =>
  formatLocalDateTimeWindow(prDetail.value?.core.time ?? [null, null]),
);
const bookingSupportSummaryHeadline = computed(() => {
  return (
    prDetail.value?.anchor.bookingSupportPreview.headline ??
    t("prPage.bookingSupportEntry.headlineFallback")
  );
});
const bookingSupportHighlights = computed(() =>
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

const handleJoinWithBookingContact = async () => {
  if (id.value === null) return;

  bookingContactActionError.value = null;
  const bookingContact = currentBookingContact.value;
  const requiresOwnerCredential =
    bookingContact?.required && bookingContact.ownerPartnerId === null;
  const wechatPhoneCredential = requiresOwnerCredential
    ? await requestBookingContactCredential()
    : null;
  if (requiresOwnerCredential && !wechatPhoneCredential) {
    return;
  }

  const result = await sharedActions.handleJoin({ wechatPhoneCredential });
  if (result) {
    bookingContactActionError.value = null;
  }
};

const ensureBookingContactVerified = async (): Promise<boolean> => {
  if (id.value === null) return false;

  const bookingContact = currentBookingContact.value;
  if (!bookingContact?.required || bookingContact.state === "VERIFIED") {
    return true;
  }
  if (!bookingContact.ownerIsCurrentViewer) {
    bookingContactActionError.value = t("prPage.bookingContact.ownerBlockedHint");
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
const scrollToRecoveryLane = () => {
  recoveryLaneRef.value?.scrollIntoView();
};
const goHome = () => {
  router.push("/");
};
</script>

<style lang="scss" scoped>
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

.booking-support-entry-card {
  display: block;
  text-decoration: none;
  color: inherit;
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
}

.location-gallery-link {
  @include mx.pu-font(label-medium);
  border: none;
  padding: 0;
  margin-top: var(--sys-spacing-xs);
  color: var(--sys-color-primary);
  background: transparent;
  width: fit-content;
  cursor: pointer;
  text-decoration: underline;
}
</style>
