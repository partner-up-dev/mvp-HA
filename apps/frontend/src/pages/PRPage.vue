<template>
  <div class="pr-page">
    <LoadingState v-if="isLoading" message="加载中..." />

    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="data">
      <div class="page-header">
        <button class="home-btn" @click="goHome" aria-label="返回首页">
          <div class="i-mdi-arrow-left font-title-large"></div>
        </button>
        <h1 v-if="data.parsed?.title" class="page-title">
          {{ data.parsed.title }}
        </h1>
      </div>

      <header class="header">
        <StatusBadge :status="data.status" />
        <time class="created-at">{{ formatDate(data.createdAt) }}</time>
      </header>

      <PRCard
        :parsed="data.parsed"
        :raw-text="data.rawText"
        :participants="data.participants"
      />

      <div class="actions">
        <ShareButton :url="shareUrl" />

        <button
          v-if="canJoin"
          class="join-btn"
          @click="handleJoin"
          :disabled="joinMutation.isPending.value"
        >
          {{ joinMutation.isPending.value ? "加入中..." : "加入" }}
        </button>

        <button
          v-if="hasJoined && !isCreator"
          class="exit-btn"
          @click="handleExit"
          :disabled="exitMutation.isPending.value"
        >
          {{ exitMutation.isPending.value ? "退出中..." : "退出" }}
        </button>

        <button
          v-if="data.status === 'OPEN' && isCreator"
          class="edit-content-btn"
          @click="showEditModal = true"
        >
          编辑内容
        </button>

        <button
          v-if="isCreator"
          class="modify-btn"
          @click="showModifyModal = true"
        >
          修改状态
        </button>
      </div>

      <!-- Edit Content Modal -->
      <EditContentModal
        v-if="showEditModal && id !== null"
        :open="showEditModal"
        :initial-parsed="data.parsed"
        :pr-id="id"
        @close="showEditModal = false"
        @success="handleEditSuccess"
      />

      <!-- Status Modify Modal -->
      <ModifyStatusModal
        v-if="id !== null"
        :open="showModifyModal"
        :pr-id="id"
        @close="showModifyModal = false"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorToast from "@/components/ErrorToast.vue";
import StatusBadge from "@/components/StatusBadge.vue";
import PRCard from "@/components/PRCard.vue";
import ShareButton from "@/components/ShareButton.vue";
import SubmitButton from "@/components/SubmitButton.vue";
import EditContentModal from "@/components/EditContentModal.vue";
import ModifyStatusModal from "@/components/ModifyStatusModal.vue";
import { usePR } from "@/queries/usePR";
import type { PRId } from "@partner-up-dev/backend";
import { useUpdatePRStatus } from "@/queries/useUpdatePRStatus";
import { useJoinPR } from "@/queries/useJoinPR";
import { useExitPR } from "@/queries/useExitPR";
import { useUserPRStore } from "@/stores/userPRStore";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";

const route = useRoute();
const router = useRouter();
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
  if (data.value.parsed.maxParticipants) {
    const currentCount = data.value.participants || 0;
    if (currentCount >= data.value.parsed.maxParticipants) return false;
  }
  return true;
});

const shareUrl = computed(() => window.location.href);

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
  data.value?.parsed?.title
    ? `${data.value.parsed.title} - 搭一把`
    : "搭子请求 - 搭一把",
);

const description = computed(
  () => data.value?.parsed?.scenario || "查看搭子请求",
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
    { property: "og:site_name", content: "搭一把 - PartnerUp" },
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
  flex-direction: column;
  align-items: stretch;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.actions > button {
  width: 100%;
}

.actions :deep(.share-button) {
  width: 100%;
  flex: unset;
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
