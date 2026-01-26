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
      <div
        v-if="showModifyModal"
        class="modal-overlay"
        @click.self="showModifyModal = false"
      >
        <div class="modal">
          <h3>修改需求状态</h3>

          <div class="status-options">
            <button
              v-for="status in statusOptions"
              :key="status.value"
              :class="[
                'status-option',
                { active: selectedStatus === status.value },
              ]"
              @click="selectedStatus = status.value"
            >
              {{ status.label }}
            </button>
          </div>

          <div class="pin-input">
            <label>输入PIN码确认</label>
            <input
              v-model="modifyPin"
              type="password"
              inputmode="numeric"
              maxlength="4"
              placeholder="****"
            />
          </div>

          <div class="modal-actions">
            <button class="cancel-btn" @click="showModifyModal = false">
              取消
            </button>
            <SubmitButton
              :loading="updateMutation.isPending.value"
              :disabled="!modifyPin || modifyPin.length !== 4"
              @click="handleUpdateStatus"
            >
              确认修改
            </SubmitButton>
          </div>

          <ErrorToast
            v-if="updateMutation.isError.value"
            :message="updateMutation.error.value?.message || '修改失败'"
            @close="updateMutation.reset()"
          />
        </div>
      </div>
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
import { usePR } from "@/queries/usePR";
import type { PRId } from "@partner-up-dev/backend";
import { useUpdatePRStatus } from "@/queries/useUpdatePRStatus";
import { useJoinPR } from "@/queries/useJoinPR";
import { useExitPR } from "@/queries/useExitPR";
import { useUserPRStore } from "@/stores/userPRStore";

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
const updateMutation = useUpdatePRStatus();
const joinMutation = useJoinPR();
const exitMutation = useExitPR();
const userPRStore = useUserPRStore();

const showEditModal = ref(false);
const showModifyModal = ref(false);
const selectedStatus = ref<"OPEN" | "ACTIVE" | "CLOSED">("OPEN");
const modifyPin = ref("");

const statusOptions = [
  { value: "OPEN" as const, label: "招募中" },
  { value: "ACTIVE" as const, label: "进行中" },
  { value: "CLOSED" as const, label: "已结束" },
];

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

const handleUpdateStatus = async () => {
  if (id.value === null) return;
  await updateMutation.mutateAsync({
    id: id.value,
    status: selectedStatus.value,
    pin: modifyPin.value,
  });

  showModifyModal.value = false;
  modifyPin.value = "";
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
  padding: var(--sys-spacing-med);
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-lg);
}

.home-btn {
  display: flex;
  background: transparent;
  border: none;
  color: var(--sys-color-on-surface);
  cursor: pointer;
}

.page-title {
  @include mx.pu-font(headline-large);
  color: var(--sys-color-on-surface);
  margin: 0;
  flex: 1;
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
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.join-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  border: none;
  border-radius: var(--sys-radius-med);
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
  border: 1px solid var(--sys-color-error);
  border-radius: var(--sys-radius-med);
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
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
  cursor: pointer;

  &:hover {
    background: var(--sys-color-surface-container-highest);
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sys-spacing-med);
}

.modal {
  background: var(--sys-color-surface-container-lowest);
  border-radius: var(--sys-radius-lg);
  padding: var(--sys-spacing-lg);
  width: 100%;
  max-width: 360px;

  h3 {
    @include mx.pu-font(title-large);
    margin-bottom: var(--sys-spacing-med);
  }
}

.status-options {
  display: flex;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-med);
}

.status-option {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface-container);
  cursor: pointer;

  &.active {
    background: var(--sys-color-primary-container);
    border-color: var(--sys-color-primary);
    color: var(--sys-color-on-primary-container);
  }
}

.pin-input {
  margin-bottom: var(--sys-spacing-med);

  label {
    @include mx.pu-font(label-medium);
    display: block;
    margin-bottom: var(--sys-spacing-xs);
    color: var(--sys-color-on-surface-variant);
  }

  input {
    @include mx.pu-font(title-medium);
    width: 100%;
    padding: var(--sys-spacing-sm);
    border: 1px solid var(--sys-color-outline);
    border-radius: var(--sys-radius-med);
    text-align: center;
    letter-spacing: 0.5em;
  }
}

.modal-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
}

.cancel-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-med);
  background: transparent;
  cursor: pointer;
}
</style>
