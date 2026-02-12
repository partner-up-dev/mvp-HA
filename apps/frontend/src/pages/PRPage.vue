<template>
  <div class="pr-page">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />

    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="data">
      <div class="page-header">
        <button
          class="home-btn"
          @click="goHome"
          :aria-label="t('common.backToHome')"
        >
          <div class="i-mdi-arrow-left font-title-large"></div>
        </button>
        <h1 v-if="data.title" class="page-title">
          {{ data.title }}
        </h1>
      </div>

      <header class="header">
        <PRStatusBadge :status="data.status" />
        <time class="created-at">{{ formatDate(data.createdAt) }}</time>
      </header>

      <PRCard
        :type="data.type"
        :time="localizedTime"
        :location="data.location"
        :partners="data.partners"
        :budget="data.budget"
        :preferences="data.preferences"
        :notes="data.notes"
        :raw-text="data.rawText"
      />

      <section class="actions">
        <button
          v-if="canJoin"
          class="join-btn"
          @click="handleJoin"
          :disabled="joinMutation.isPending.value"
        >
          {{
            joinMutation.isPending.value
              ? t("prPage.joining")
              : t("prPage.join")
          }}
        </button>

        <button
          v-if="hasJoined && !isCreator"
          class="exit-btn"
          @click="handleExit"
          :disabled="exitMutation.isPending.value"
        >
          {{
            exitMutation.isPending.value
              ? t("prPage.exiting")
              : t("prPage.exit")
          }}
        </button>

        <button
          v-if="
            (data.status === 'OPEN' || data.status === 'DRAFT') && isCreator
          "
          class="edit-content-btn"
          @click="showEditModal = true"
        >
          {{ t("prPage.editContent") }}
        </button>

        <button
          v-if="isCreator"
          class="modify-btn"
          @click="showModifyModal = true"
        >
          {{ t("prPage.modifyStatus") }}
        </button>
      </section>

      <!-- Share PR Component -->
      <PRShareCarousel
        class="space-m-t-lg space-p-x-sm"
        v-if="id !== null"
        :share-url="shareUrl"
        :pr-id="id"
        :pr-data="data"
      />

      <!-- Edit Content Modal -->
      <EditPRContentModal
        v-if="showEditModal && id !== null"
        :open="showEditModal"
        :initial-fields="data"
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
import PRStatusBadge from "@/components/common/PRStatusBadge.vue";
import PRCard from "@/components/pr/PRCard.vue";
import PRShareCarousel from "@/components/share/PRShareCarousel.vue";
import EditPRContentModal from "@/components/pr/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/components/pr/UpdatePRStatusModal.vue";
import Footer from "@/components/common/Footer.vue";
import { usePR } from "@/queries/usePR";
import type { PRId } from "@partner-up-dev/backend";
import { useJoinPR } from "@/queries/useJoinPR";
import { useExitPR } from "@/queries/useExitPR";
import { useUserPRStore } from "@/stores/userPRStore";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";

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
const joinMutation = useJoinPR();
const exitMutation = useExitPR();
const userPRStore = useUserPRStore();

const showEditModal = ref(false);
const showModifyModal = ref(false);

useBodyScrollLock(computed(() => showEditModal.value || showModifyModal.value));

// Check if current user is creator
const isCreator = computed(() => {
  if (id.value === null) return false;
  return userPRStore.isCreatorOf(id.value);
});

// Check if current user has joined
const hasJoined = computed(() => {
  if (id.value === null) return false;
  return userPRStore.isParticipantOf(id.value);
});

// Check if can join
const canJoin = computed(() => {
  if (!data.value) return false;
  if (isCreator.value || hasJoined.value) return false;
  if (data.value.status !== "OPEN" && data.value.status !== "ACTIVE")
    return false;
  const maxPartners = data.value.partners[2];
  const currentCount = data.value.partners[1];
  if (maxPartners !== null && currentCount >= maxPartners) return false;
  return true;
});

const shareUrl = computed(() => window.location.href);

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
  formatDateTime(data.value?.time[0] ?? null),
  formatDateTime(data.value?.time[1] ?? null),
]);

const handleEditSuccess = () => {
  showEditModal.value = false;
};

const goHome = () => {
  router.push("/");
};

const handleJoin = async () => {
  if (id.value === null) return;
  await joinMutation.mutateAsync(id.value);
  userPRStore.joinPR(id.value);
};

const handleExit = async () => {
  if (id.value === null) return;
  await exitMutation.mutateAsync(id.value);
  userPRStore.exitPR(id.value);
};

// Set up dynamic meta tags
const title = computed(() =>
  data.value?.title
    ? t("prPage.metaTitleWithName", { title: data.value.title })
    : t("prPage.metaFallbackTitle"),
);

const description = computed(
  () => data.value?.type || t("prPage.metaFallbackDescription"),
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

.page-header {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-lg);
  min-width: 0;
}

.home-btn {
  display: flex;
  background: transparent;
  border: none;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  min-width: var(--sys-size-large);
  min-height: var(--sys-size-large);
  border-radius: 999px;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--sys-color-surface-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.page-title {
  @include mx.pu-font(headline-large);
  color: var(--sys-color-on-surface);
  margin: 0;
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sys-spacing-med);
}

.created-at {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.actions {
  display: flex;
  flex-direction: row;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.actions > button {
  width: 100%;
}

@include mx.breakpoint(md) {
  .actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

.join-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: none;
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;
  font-weight: 600;

  &:hover:not(:disabled) {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.exit-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-error);
  border-radius: var(--sys-radius-sm);
  background: transparent;
  color: var(--sys-color-error);
  cursor: pointer;
  font-weight: 600;

  &:hover:not(:disabled) {
    background: var(--sys-color-error-container);
    color: var(--sys-color-on-error-container);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.edit-content-btn,
.modify-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
  cursor: pointer;

  &:hover {
    background: var(--sys-color-surface-container-highest);
  }
}
</style>
