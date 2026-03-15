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

      <AnchorPRActionsBar
        :can-join="sharedActions.canJoin.value"
        :has-joined="sharedActions.hasJoined.value"
        :is-creator="isCreator"
        :can-confirm="attendanceActions.canConfirm.value"
        :has-started="attendanceActions.hasStarted.value"
        :show-edit-content-action="sharedActions.showEditContentAction.value"
        :show-modify-status-action="sharedActions.showModifyStatusAction.value"
        :show-check-in-followup="
          attendanceActions.showCheckInFollowup.value
        "
        :check-in-followup-status-label="
          attendanceActions.checkInFollowupStatusLabel.value
        "
        :slot-state-text="sharedActions.slotStateText.value"
        :join-pending="sharedActions.joinPending.value"
        :exit-pending="sharedActions.exitPending.value"
        :confirm-pending="attendanceActions.confirmPending.value"
        :check-in-pending="attendanceActions.checkInPending.value"
        @join="sharedActions.handleJoin"
        @exit="sharedActions.handleExit"
        @confirm-slot="attendanceActions.handleConfirmSlot"
        @prepare-check-in="attendanceActions.prepareCheckIn"
        @submit-check-in="attendanceActions.submitCheckIn"
        @cancel-check-in="attendanceActions.cancelPendingCheckIn"
        @edit-content="showEditModal = true"
        @modify-status="showModifyModal = true"
      />

      <section
        v-if="sharedActions.hasJoined.value"
        class="section-card wechat-reminder-section"
      >
        <h2 class="section-title">{{ t("prPage.wechatReminder.title") }}</h2>
        <p class="section-description">
          {{ reminderHintText }}
        </p>

        <button
          v-if="canToggleReminder"
          class="primary-btn"
          :disabled="reminderTogglePending"
          @click="handleToggleWechatReminder"
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
          v-else-if="
            isWeChatEnv && reminderConfigured && !reminderAuthenticated
          "
          class="secondary-btn"
          @click="handleGoWechatLogin"
        >
          {{ t("prPage.wechatReminder.loginAction") }}
        </button>
      </section>

      <section
        v-if="sameBatchAlternatives.length > 0"
        class="section-card same-batch-section"
      >
        <h2 class="section-title">{{ t("prPage.sameBatch.title") }}</h2>
        <p class="section-description">
          {{ t("prPage.sameBatch.subtitle") }}
        </p>
        <div class="same-batch-list">
          <router-link
            v-for="item in sameBatchAlternatives"
            :key="item.id"
            :to="anchorPRDetailPath(item.id as PRId)"
            class="same-batch-item"
          >
            <span class="same-batch-item__location">📍 {{ item.location }}</span>
            <span class="same-batch-item__status">{{
              t(`prStatus.${item.status}`)
            }}</span>
          </router-link>
        </div>
      </section>

      <section v-if="showAlternativeBatches" class="section-card">
        <h2 class="section-title">{{ t("prPage.alternativeBatch.title") }}</h2>
        <p class="section-description">
          {{ t("prPage.alternativeBatch.subtitle") }}
        </p>

        <div v-if="isAlternativeLoading" class="section-description">
          {{ t("common.loading") }}
        </div>
        <div
          v-else-if="alternativeBatchRecommendations.length === 0"
          class="section-description"
        >
          {{ t("prPage.alternativeBatch.empty") }}
        </div>
        <div v-else class="alternative-batch-list">
          <div
            v-for="item in alternativeBatchRecommendations"
            :key="`${item.timeWindow[0]}-${item.timeWindow[1]}`"
            class="alternative-batch-item"
          >
            <div class="alternative-batch-item__meta">
              <span class="alternative-batch-item__time">
                {{ formatBatchWindowLabel(item.timeWindow) }}
              </span>
              <span class="alternative-batch-item__location">
                📍 {{ item.location }}
              </span>
            </div>
            <button
              class="primary-btn"
              :disabled="acceptAlternativeBatchMutation.isPending.value"
              @click="handleAcceptAlternativeBatch(item.timeWindow)"
            >
              {{ t("prPage.alternativeBatch.accept") }}
            </button>
          </div>
        </div>
      </section>

      <PRShareSection
        :pr-id="id"
        :share-url="shareUrl"
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
import {
  useAcceptAnchorAlternativeBatch,
  useAnchorAlternativeBatches,
  useAnchorPR,
  useJoinAnchorPR,
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
  formatLocalDateTimeWindowLabel,
} from "@/shared/datetime/formatLocalDateTime";

const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();

const { data, isLoading, error, refetch } = useAnchorPR(id);
const prDetail = computed(() => data.value);
const joinMutation = useJoinAnchorPR();
const acceptAlternativeBatchMutation = useAcceptAnchorAlternativeBatch();
const userSessionStore = useUserSessionStore();
const showEditModal = ref(false);
const showModifyModal = ref(false);
const showLocationGalleryModal = ref(false);

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

const showAlternativeBatches = computed(
  () => prDetail.value?.status === "FULL" && id.value !== null,
);
const { data: alternativeBatchData, isLoading: isAlternativeLoading } =
  useAnchorAlternativeBatches(id, showAlternativeBatches);
const alternativeBatchRecommendations = computed(
  () => alternativeBatchData.value?.recommendations ?? [],
);
const sameBatchAlternatives = computed(
  () => prDetail.value?.anchor.related.sameBatchAlternatives ?? [],
);

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

const {
  canToggleReminder,
  handleGoWechatLogin,
  handleToggleWechatReminder,
  isWeChatEnv,
  reminderAuthenticated,
  reminderConfigured,
  reminderEnabled,
  reminderHintText,
  reminderTogglePending,
} = usePRReminderSubscription(id);

const { shareUrl, prShareData } = usePRShareContext({ id, pr: prDetail });
usePRDetailHead({ pr: prDetail, shareUrl });

const formatDate = (dateStr: string) =>
  formatLocalDateTimeValue(dateStr) ?? dateStr;
const localizedTime = computed<[string | null, string | null]>(() =>
  formatLocalDateTimeWindow(prDetail.value?.core.time ?? [null, null]),
);
const formatBatchWindowLabel = (timeWindow: [string | null, string | null]) => {
  return formatLocalDateTimeWindowLabel(
    timeWindow,
    {},
    t("prPage.alternativeBatch.unknownTime"),
  );
};
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

const handleAcceptAlternativeBatch = async (
  targetTimeWindow: [string | null, string | null],
) => {
  if (id.value === null) return;
  const result = await acceptAlternativeBatchMutation.mutateAsync({
    id: id.value,
    targetTimeWindow,
  });
  await joinMutation.mutateAsync({ id: result.prId as PRId });
  await router.push(anchorPRDetailPath(result.prId as PRId));
};
const handleEditSuccess = () => {
  showEditModal.value = false;
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

.booking-support-entry-card__action,
.same-batch-item__status {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-primary);
}

.same-batch-list,
.alternative-batch-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.same-batch-item,
.alternative-batch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-sm);
  @include mx.pu-surface-card(inset-high);
}

.same-batch-item {
  text-decoration: none;
  color: inherit;
}

.alternative-batch-item__meta {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.alternative-batch-item__time {
  @include mx.pu-font(label-medium);
}

.alternative-batch-item__location {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.primary-btn,
.secondary-btn {
  @include mx.pu-font(label-medium);
  cursor: pointer;
}

.primary-btn {
  @include mx.pu-pill-action(solid-primary, small);
  border: none;
}

.secondary-btn {
  @include mx.pu-pill-action(outline-transparent, small);
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
