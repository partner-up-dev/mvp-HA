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
          :to="anchorPREconomyPath(id)"
          class="economy-entry-card"
        >
          <div class="economy-entry-card__header">
            <h2 class="section-title">{{ t("prPage.economyEntry.title") }}</h2>
            <span class="economy-entry-card__action">{{
              t("prPage.economyEntry.viewAction")
            }}</span>
          </div>
          <p class="section-description">{{ economySummaryModel }}</p>
          <p class="section-description">{{ economySummaryDeadline }}</p>
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

    <Footer />
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import LoadingIndicator from "@/components/common/LoadingIndicator.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import PRFactsCard from "@/components/pr/PRFactsCard.vue";
import PRLocationGalleryModal from "@/components/pr/PRLocationGalleryModal.vue";
import EditPRContentModal from "@/components/pr/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/components/pr/UpdatePRStatusModal.vue";
import Footer from "@/components/common/Footer.vue";
import PageScaffold from "@/widgets/common/PageScaffold.vue";
import PRHeroHeader from "@/widgets/pr/PRHeroHeader.vue";
import PRShareSection from "@/widgets/pr/PRShareSection.vue";
import AnchorPRActionsBar from "@/widgets/pr/AnchorPRActionsBar.vue";
import {
  useAcceptAnchorAlternativeBatch,
  useAnchorAlternativeBatches,
  useAnchorPR,
  useJoinAnchorPR,
} from "@/queries/useAnchorPR";
import { useWeChatReminderSubscription } from "@/queries/useWeChatReminderSubscription";
import { useUpdateWeChatReminderSubscription } from "@/queries/useUpdateWeChatReminderSubscription";
import { usePoisByIds } from "@/queries/usePoisByIds";
import { useUserSessionStore } from "@/stores/userSessionStore";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { useSharedPRActions } from "@/features/pr-actions/useSharedPRActions";
import { useAnchorAttendanceActions } from "@/features/pr-actions/useAnchorAttendanceActions";
import { usePRShareContext } from "@/features/share/usePRShareContext";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { requireWeChatActionAuth } from "@/composables/requireWeChatActionAuth";
import { redirectToWeChatOAuthLogin } from "@/composables/useAutoWeChatLogin";
import {
  anchorPRDetailPath,
  anchorPREconomyPath,
} from "@/entities/pr/routes";
import type { AnchorPRFormFields } from "@/entities/pr/types";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const id = computed<PRId | null>(() => {
  const rawId = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id;
  const parsed = Number(rawId);
  return Number.isFinite(parsed) && parsed > 0 ? (parsed as PRId) : null;
});

const { data, isLoading, error, refetch } = useAnchorPR(id);
const prDetail = computed(() => data.value);
const joinMutation = useJoinAnchorPR();
const acceptAlternativeBatchMutation = useAcceptAnchorAlternativeBatch();
const wechatReminderSubscriptionQuery = useWeChatReminderSubscription();
const updateWechatReminderSubscriptionMutation =
  useUpdateWeChatReminderSubscription();
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

const locationId = computed(() => {
  const location = prDetail.value?.core.location;
  if (!location) return null;
  const normalized = location.trim();
  return normalized.length > 0 ? normalized : null;
});
const poiIdsCsv = computed(() => (locationId.value ? locationId.value : null));
const { data: poisByIdsData } = usePoisByIds(poiIdsCsv);
const locationGallery = computed(() => {
  const targetLocationId = locationId.value;
  if (!targetLocationId) return [];
  const matchedPoi = (poisByIdsData.value ?? []).find(
    (poi) => poi.id === targetLocationId,
  );
  if (!matchedPoi) return [];
  return matchedPoi.gallery
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
});

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

const LIVE_POLL_INTERVAL_MS = 2_000;
const LIVE_POLL_MAX_ATTEMPTS = 10;
const livePollAttemptCount = ref(0);
const livePollTimerId = ref<number | null>(null);
const livePollInFlight = ref(false);
const stopLivePolling = () => {
  if (livePollTimerId.value !== null) {
    window.clearInterval(livePollTimerId.value);
    livePollTimerId.value = null;
  }
};
const tickLivePolling = async () => {
  if (id.value === null) return stopLivePolling();
  if (livePollAttemptCount.value >= LIVE_POLL_MAX_ATTEMPTS) {
    return stopLivePolling();
  }
  if (livePollInFlight.value) return;
  livePollAttemptCount.value += 1;
  livePollInFlight.value = true;
  try {
    await refetch();
  } finally {
    livePollInFlight.value = false;
    if (livePollAttemptCount.value >= LIVE_POLL_MAX_ATTEMPTS) {
      stopLivePolling();
    }
  }
};
const startLivePolling = () => {
  if (id.value === null || livePollTimerId.value !== null) return;
  livePollTimerId.value = window.setInterval(() => {
    void tickLivePolling();
  }, LIVE_POLL_INTERVAL_MS);
};
const resetLivePolling = () => {
  livePollAttemptCount.value = 0;
  if (id.value === null) return stopLivePolling();
  if (livePollTimerId.value === null) startLivePolling();
};

watch(
  id,
  (nextId) => {
    stopLivePolling();
    livePollAttemptCount.value = 0;
    livePollInFlight.value = false;
    if (nextId !== null) startLivePolling();
  },
  { immediate: true },
);
onBeforeUnmount(stopLivePolling);

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

const isWeChatEnv = computed(() =>
  typeof navigator === "undefined" ? false : isWeChatBrowser(),
);
const reminderConfigured = computed(
  () => wechatReminderSubscriptionQuery.data.value?.configured ?? false,
);
const reminderAuthenticated = computed(
  () => wechatReminderSubscriptionQuery.data.value?.authenticated ?? false,
);
const reminderEnabled = computed(
  () => wechatReminderSubscriptionQuery.data.value?.enabled ?? false,
);
const reminderTogglePending = computed(
  () => updateWechatReminderSubscriptionMutation.isPending.value,
);
const canToggleReminder = computed(
  () =>
    isWeChatEnv.value &&
    reminderConfigured.value &&
    reminderAuthenticated.value &&
    !wechatReminderSubscriptionQuery.isLoading.value,
);
const reminderHintText = computed(() => {
  if (!isWeChatEnv.value) return t("prPage.wechatReminder.nonWechatHint");
  if (!reminderConfigured.value) {
    return t("prPage.wechatReminder.unconfiguredHint");
  }
  if (!reminderAuthenticated.value) return t("prPage.wechatReminder.loginHint");
  return reminderEnabled.value
    ? t("prPage.wechatReminder.enabledHint")
    : t("prPage.wechatReminder.disabledHint");
});

const handleToggleWechatReminder = async () => {
  if (id.value === null || !isWeChatEnv.value) return;
  if (!(await requireWeChatActionAuth(window.location.href))) return;
  await updateWechatReminderSubscriptionMutation.mutateAsync({
    enabled: !reminderEnabled.value,
  });
};

const handleGoWechatLogin = () => {
  if (typeof window === "undefined") return;
  redirectToWeChatOAuthLogin(window.location.href);
};

const { shareUrl, prShareData } = usePRShareContext({ id, pr: prDetail });

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(locale.value, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const normalizeTimeValue = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed;
};
const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const parseIsoDateOnlyAsLocalDate = (value: string): Date | null => {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDateTime = (value: string | null): string | null => {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return null;
  if (ISO_DATE_ONLY_PATTERN.test(normalized)) {
    const dateOnly = parseIsoDateOnlyAsLocalDate(normalized);
    if (!dateOnly) return value;
    return dateOnly.toLocaleDateString(locale.value, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale.value, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const localizedTime = computed<[string | null, string | null]>(() => [
  formatDateTime(prDetail.value?.core.time[0] ?? null),
  formatDateTime(prDetail.value?.core.time[1] ?? null),
]);
const formatBatchWindowLabel = (timeWindow: [string | null, string | null]) => {
  const [start, end] = timeWindow;
  const startText =
    formatDateTime(start) ?? t("prPage.alternativeBatch.unknownTime");
  const endText = formatDateTime(end);
  return endText ? `${startText} - ${endText}` : startText;
};
const economySummaryModel = computed(() => {
  const model = prDetail.value?.anchor.economyPreview.paymentModelApplied;
  if (model === "A") return t("prPage.economyEntry.modelA");
  if (model === "C") return t("prPage.economyEntry.modelC");
  return t("prPage.economyEntry.modelUnknown");
});
const economySummaryDeadline = computed(() => {
  const deadline =
    prDetail.value?.anchor.economyPreview.resourceBookingDeadlineAt ?? null;
  if (!deadline) return t("prPage.economyEntry.deadlineUnset");
  return t("prPage.economyEntry.deadlineWithValue", {
    deadline:
      formatDateTime(deadline) ?? t("prPage.economyEntry.deadlineUnset"),
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

const title = computed(() =>
  prDetail.value?.title
    ? t("prPage.metaTitleWithName", { title: prDetail.value.title })
    : t("prPage.metaFallbackTitle"),
);
const description = computed(
  () => prDetail.value?.core.type || t("prPage.metaFallbackDescription"),
);
useHead({
  title,
  meta: [
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: shareUrl },
    { property: "og:site_name", content: t("app.siteName") },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ],
});
</script>

<style lang="scss" scoped>
.section-card {
  margin-top: var(--sys-spacing-lg);
  padding: var(--sys-spacing-med);
  border-radius: 12px;
  background: var(--sys-color-surface-container);
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.section-description {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: var(--sys-color-on-surface-variant);
}

.economy-entry-card {
  display: block;
  text-decoration: none;
  color: inherit;
}

.economy-entry-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.economy-entry-card__action,
.same-batch-item__status {
  font-size: 0.75rem;
  color: var(--sys-color-primary);
}

.same-batch-list,
.alternative-batch-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.same-batch-item,
.alternative-batch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-sm);
  padding: 0.625rem 0.75rem;
  border-radius: 10px;
  background: var(--sys-color-surface-container-high);
}

.same-batch-item {
  text-decoration: none;
  color: inherit;
}

.alternative-batch-item__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.alternative-batch-item__time {
  font-size: 0.8125rem;
}

.alternative-batch-item__location {
  font-size: 0.75rem;
  color: var(--sys-color-on-surface-variant);
}

.primary-btn,
.secondary-btn {
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.primary-btn {
  border: none;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.secondary-btn {
  border: 1px solid var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
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
