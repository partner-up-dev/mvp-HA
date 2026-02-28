<template>
  <div class="pr-page">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />

    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <PRHeroHeader
        :title="prDetail.title"
        :status="prDetail.status"
        :created-at-label="formatDate(prDetail.createdAt)"
        @back="goHome"
      />

      <PRCard
        :type="prDetail.type"
        :time="localizedTime"
        :location="prDetail.location"
        :min-partners="prDetail.minPartners"
        :max-partners="prDetail.maxPartners"
        :partners="prDetail.partners"
        :budget="prDetail.budget"
        :preferences="prDetail.preferences"
        :notes="prDetail.notes"
        :raw-text="prDetail.rawText"
      />

      <PRActionsPanel
        :can-join="actions.canJoin.value"
        :has-joined="actions.hasJoined.value"
        :is-creator="isCreator"
        :can-confirm="actions.canConfirm.value"
        :has-started="actions.hasStarted.value"
        :show-edit-content-action="actions.showEditContentAction.value"
        :show-modify-status-action="actions.showModifyStatusAction.value"
        :show-check-in-followup="actions.showCheckInFollowup.value"
        :check-in-followup-status-label="
          actions.checkInFollowupStatusLabel.value
        "
        :slot-state-text="actions.slotStateText.value"
        :join-pending="actions.joinPending.value"
        :exit-pending="actions.exitPending.value"
        :confirm-pending="actions.confirmPending.value"
        :check-in-pending="actions.checkInPending.value"
        @join="actions.handleJoin"
        @exit="actions.handleExit"
        @confirm-slot="actions.handleConfirmSlot"
        @prepare-check-in="actions.prepareCheckIn"
        @submit-check-in="actions.submitCheckIn"
        @cancel-check-in="actions.cancelPendingCheckIn"
        @edit-content="showEditModal = true"
        @modify-status="showModifyModal = true"
      />

      <section
        v-if="actions.hasJoined.value"
        class="wechat-reminder-section"
      >
        <h2 class="wechat-reminder-title">
          {{ t("prPage.wechatReminder.title") }}
        </h2>
        <p class="wechat-reminder-description">
          {{ reminderHintText }}
        </p>

        <button
          v-if="canToggleReminder"
          class="wechat-reminder-action"
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
            isWeChatEnv &&
            reminderConfigured &&
            !reminderAuthenticated
          "
          class="wechat-reminder-action secondary"
          @click="handleGoWechatLogin"
        >
          {{ t("prPage.wechatReminder.loginAction") }}
        </button>
      </section>

      <section
        v-if="sameBatchAlternatives.length > 0"
        class="same-batch-section"
      >
        <h2 class="same-batch-title">{{ t("prPage.sameBatch.title") }}</h2>
        <p class="same-batch-subtitle">
          {{ t("prPage.sameBatch.subtitle") }}
        </p>
        <div class="same-batch-list">
          <router-link
            v-for="item in sameBatchAlternatives"
            :key="item.id"
            :to="{ name: 'pr', params: { id: item.id } }"
            class="same-batch-item"
          >
            <span class="same-batch-item__location"
              >📍 {{ item.location }}</span
            >
            <span class="same-batch-item__status">{{
              t(`prStatus.${item.status}`)
            }}</span>
          </router-link>
        </div>
      </section>

      <section v-if="showAlternativeBatches" class="alternative-batch-section">
        <h2 class="alternative-batch-title">
          {{ t("prPage.alternativeBatch.title") }}
        </h2>
        <p class="alternative-batch-subtitle">
          {{ t("prPage.alternativeBatch.subtitle") }}
        </p>

        <div v-if="isAlternativeLoading" class="alternative-batch-loading">
          {{ t("common.loading") }}
        </div>
        <div
          v-else-if="alternativeBatchRecommendations.length === 0"
          class="alternative-batch-empty"
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
              class="alternative-batch-item__action"
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

      <!-- Edit Content Modal -->
      <EditPRContentModal
        v-if="showEditModal && id !== null"
        :open="showEditModal"
        :initial-fields="prDetail"
        :pr-id="id"
        @close="showEditModal = false"
        @success="handleEditSuccess"
      />

      <!-- Status Modify Modal -->
      <UpdatePRStatusModal
        v-if="id !== null"
        :open="showModifyModal"
        :pr-id="id"
        @close="showModifyModal = false"
      />
    </template>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import { useI18n } from "vue-i18n";
import LoadingIndicator from "@/components/common/LoadingIndicator.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import PRCard from "@/components/pr/PRCard.vue";
import EditPRContentModal from "@/components/pr/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/components/pr/UpdatePRStatusModal.vue";
import Footer from "@/components/common/Footer.vue";
import PRHeroHeader from "@/widgets/pr/PRHeroHeader.vue";
import PRActionsPanel from "@/widgets/pr/PRActionsPanel.vue";
import PRShareSection from "@/widgets/pr/PRShareSection.vue";
import { usePR } from "@/queries/usePR";
import { useAnchorEventDetail } from "@/queries/useAnchorEventDetail";
import { useAlternativeBatches } from "@/queries/useAlternativeBatches";
import { useAcceptAlternativeBatch } from "@/queries/useAcceptAlternativeBatch";
import { useJoinPR } from "@/queries/useJoinPR";
import { useWeChatReminderSubscription } from "@/queries/useWeChatReminderSubscription";
import { useUpdateWeChatReminderSubscription } from "@/queries/useUpdateWeChatReminderSubscription";
import type { PRId } from "@partner-up-dev/backend";
import { useUserPRStore } from "@/stores/userPRStore";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { usePRActions } from "@/features/pr-actions/usePRActions";
import { usePRShareContext } from "@/features/share/usePRShareContext";
import type { PRDetailView } from "@/entities/pr/types";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { requireWeChatActionAuth } from "@/processes/wechat-auth/guards/requireWeChatActionAuth";
import { redirectToWeChatOAuthLogin } from "@/composables/useAutoWeChatLogin";

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

const { data, isLoading, error, refetch } = usePR(id);
const prDetail = computed(() => data.value as PRDetailView | undefined);

const anchorEventId = computed<number | null>(() => {
  const value = prDetail.value?.anchorEventId;
  return typeof value === "number" && value > 0 ? value : null;
});
const { data: anchorEventDetail } = useAnchorEventDetail(anchorEventId);
const showAlternativeBatches = computed(
  () =>
    prDetail.value?.prKind === "ANCHOR" &&
    prDetail.value?.status === "FULL" &&
    id.value !== null,
);
const { data: alternativeBatchData, isLoading: isAlternativeLoading } =
  useAlternativeBatches(id, showAlternativeBatches);
const acceptAlternativeBatchMutation = useAcceptAlternativeBatch();
const joinMutation = useJoinPR();
const wechatReminderSubscriptionQuery = useWeChatReminderSubscription();
const updateWechatReminderSubscriptionMutation =
  useUpdateWeChatReminderSubscription();

const sameBatchAlternatives = computed(() => {
  const current = prDetail.value;
  const detail = anchorEventDetail.value;
  if (!current || !detail) return [];
  if (current.prKind !== "ANCHOR" || current.status !== "FULL") return [];
  if (current.batchId === null || current.batchId === undefined) return [];

  const batch = detail.batches.find((b) => b.id === current.batchId);
  if (!batch) return [];

  return batch.prs.filter(
    (pr) =>
      pr.id !== current.id &&
      pr.location !== null &&
      pr.status !== "FULL" &&
      pr.status !== "EXPIRED" &&
      pr.status !== "CLOSED",
  );
});

const alternativeBatchRecommendations = computed(
  () => alternativeBatchData.value?.recommendations ?? [],
);
const userPRStore = useUserPRStore();

const showEditModal = ref(false);
const showModifyModal = ref(false);

useBodyScrollLock(computed(() => showEditModal.value || showModifyModal.value));

// Check if current user is creator
const isCreator = computed(() => {
  if (id.value === null) return false;
  return userPRStore.isCreatorOf(id.value);
});

const LIVE_POLL_INTERVAL_MS = 1_000;
const LIVE_POLL_MAX_ATTEMPTS = 20;
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
  if (id.value === null) {
    stopLivePolling();
    return;
  }
  if (livePollAttemptCount.value >= LIVE_POLL_MAX_ATTEMPTS) {
    stopLivePolling();
    return;
  }
  if (livePollInFlight.value) {
    return;
  }

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
  if (id.value === null || livePollTimerId.value !== null) {
    return;
  }
  livePollTimerId.value = window.setInterval(() => {
    void tickLivePolling();
  }, LIVE_POLL_INTERVAL_MS);
};

const resetLivePolling = () => {
  livePollAttemptCount.value = 0;
  if (id.value === null) {
    stopLivePolling();
    return;
  }
  if (livePollTimerId.value === null) {
    startLivePolling();
  }
};

watch(
  id,
  (nextId) => {
    stopLivePolling();
    livePollAttemptCount.value = 0;
    livePollInFlight.value = false;
    if (nextId !== null) {
      startLivePolling();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopLivePolling();
});

const actions = usePRActions({
  id,
  pr: prDetail,
  isCreator,
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
  if (!isWeChatEnv.value) {
    return t("prPage.wechatReminder.nonWechatHint");
  }
  if (!reminderConfigured.value) {
    return t("prPage.wechatReminder.unconfiguredHint");
  }
  if (!reminderAuthenticated.value) {
    return t("prPage.wechatReminder.loginHint");
  }
  return reminderEnabled.value
    ? t("prPage.wechatReminder.enabledHint")
    : t("prPage.wechatReminder.disabledHint");
});

const handleToggleWechatReminder = async () => {
  if (id.value === null) return;
  if (!isWeChatEnv.value) return;
  if (!(await requireWeChatActionAuth(window.location.href))) return;

  await updateWechatReminderSubscriptionMutation.mutateAsync({
    enabled: !reminderEnabled.value,
  });
};

const handleGoWechatLogin = () => {
  if (typeof window === "undefined") return;
  redirectToWeChatOAuthLogin(window.location.href);
};

const { shareUrl, prShareData } = usePRShareContext({
  id,
  pr: prDetail,
});

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString(locale.value, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
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
  formatDateTime(prDetail.value?.time[0] ?? null),
  formatDateTime(prDetail.value?.time[1] ?? null),
]);

const formatBatchWindowLabel = (timeWindow: [string | null, string | null]) => {
  const [start, end] = timeWindow;
  const startText =
    formatDateTime(start) ?? t("prPage.alternativeBatch.unknownTime");
  const endText = formatDateTime(end);
  return endText ? `${startText} - ${endText}` : startText;
};

const handleAcceptAlternativeBatch = async (
  targetTimeWindow: [string | null, string | null],
) => {
  if (id.value === null) return;
  const result = await acceptAlternativeBatchMutation.mutateAsync({
    id: id.value,
    targetTimeWindow,
  });
  await joinMutation.mutateAsync({ id: result.prId as PRId });
  await router.push({ name: "pr", params: { id: result.prId } });
};

const handleEditSuccess = () => {
  showEditModal.value = false;
};

const goHome = () => {
  router.push("/");
};

// Set up dynamic meta tags
const title = computed(() =>
  prDetail.value?.title
    ? t("prPage.metaTitleWithName", { title: prDetail.value.title })
    : t("prPage.metaFallbackTitle"),
);

const description = computed(
  () => prDetail.value?.type || t("prPage.metaFallbackDescription"),
);

useHead({
  title,
  meta: [
    { name: "description", content: description },
    // OpenGraph tags
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: shareUrl },
    { property: "og:site_name", content: t("app.siteName") },
    // Twitter Card tags
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ],
});
</script>

<style lang="scss" scoped>
.pr-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}

.wechat-reminder-section {
  margin-top: var(--sys-spacing-lg);
  padding: var(--sys-spacing-med);
  border-radius: 12px;
  background: var(--sys-color-surface-container);
}

.wechat-reminder-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.wechat-reminder-description {
  margin: 0.35rem 0 0.75rem;
  font-size: 0.875rem;
  color: var(--sys-color-on-surface-variant);
}

.wechat-reminder-action {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  font-size: 0.8rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}

.wechat-reminder-action.secondary {
  border: 1px solid var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.same-batch-section {
  margin-top: var(--sys-spacing-lg);
  padding: var(--sys-spacing-med);
  border-radius: 12px;
  background: var(--sys-color-surface-container);
}

.same-batch-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.same-batch-subtitle {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.875rem;
  color: var(--sys-color-on-surface-variant);
}

.same-batch-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.same-batch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  border-radius: 10px;
  background: var(--sys-color-surface-container-high);
  text-decoration: none;
  color: inherit;
}

.same-batch-item__location {
  font-size: 0.875rem;
}

.same-batch-item__status {
  font-size: 0.75rem;
  color: var(--sys-color-primary);
}

.alternative-batch-section {
  margin-top: var(--sys-spacing-lg);
  padding: var(--sys-spacing-med);
  border-radius: 12px;
  background: var(--sys-color-surface-container);
}

.alternative-batch-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.alternative-batch-subtitle {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.875rem;
  color: var(--sys-color-on-surface-variant);
}

.alternative-batch-loading,
.alternative-batch-empty {
  font-size: 0.875rem;
  color: var(--sys-color-on-surface-variant);
}

.alternative-batch-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.alternative-batch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  border-radius: 10px;
  background: var(--sys-color-surface-container-high);
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

.alternative-batch-item__action {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  font-size: 0.75rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
}
</style>
