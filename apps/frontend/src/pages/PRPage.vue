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
        :check-in-followup-status-label="actions.checkInFollowupStatusLabel.value"
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

      <PRShareSection :pr-id="id" :share-url="shareUrl" :pr-data="prShareData" />

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
import { ref, computed } from "vue";
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
import type { PRId } from "@partner-up-dev/backend";
import { useUserPRStore } from "@/stores/userPRStore";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { usePRActions } from "@/features/pr-actions/usePRActions";
import { usePRShareContext } from "@/features/share/usePRShareContext";
import type { PRDetailView } from "@/entities/pr/types";

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

const { data, isLoading, error } = usePR(id);
const prDetail = computed(() => data.value as PRDetailView | undefined);
const userPRStore = useUserPRStore();

const showEditModal = ref(false);
const showModifyModal = ref(false);

useBodyScrollLock(computed(() => showEditModal.value || showModifyModal.value));

// Check if current user is creator
const isCreator = computed(() => {
  if (id.value === null) return false;
  return userPRStore.isCreatorOf(id.value);
});

const actions = usePRActions({
  id,
  pr: prDetail,
  isCreator,
});

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
</style>
