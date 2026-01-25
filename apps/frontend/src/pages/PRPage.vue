<template>
  <div class="pr-page">
    <LoadingState v-if="isLoading" message="加载中..." />

    <ErrorToast
      v-else-if="error"
      :message="error.message"
      persistent
    />

    <template v-else-if="data">
      <header class="header">
        <StatusBadge :status="data.status" />
        <time class="created-at">{{ formatDate(data.createdAt) }}</time>
      </header>

      <PRCard :parsed="data.parsed" :raw-text="data.rawText" />

      <div class="actions">
        <ShareButton :url="shareUrl" />

        <button class="modify-btn" @click="showModifyModal = true">
          修改状态
        </button>
      </div>

      <!-- Status Modify Modal -->
      <div v-if="showModifyModal" class="modal-overlay" @click.self="showModifyModal = false">
        <div class="modal">
          <h3>修改需求状态</h3>

          <div class="status-options">
            <button
              v-for="status in statusOptions"
              :key="status.value"
              :class="['status-option', { active: selectedStatus === status.value }]"
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
            <button class="cancel-btn" @click="showModifyModal = false">取消</button>
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
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import LoadingState from '@/components/LoadingState.vue';
import ErrorToast from '@/components/ErrorToast.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import PRCard from '@/components/PRCard.vue';
import ShareButton from '@/components/ShareButton.vue';
import SubmitButton from '@/components/SubmitButton.vue';
import { usePR } from '@/queries/usePR';
import { useUpdatePRStatus } from '@/queries/useUpdatePRStatus';

const route = useRoute();
const id = computed(() => route.params.id as string);

const { data, isLoading, error } = usePR(id);
const updateMutation = useUpdatePRStatus();

const showModifyModal = ref(false);
const selectedStatus = ref<'OPEN' | 'FULL' | 'CLOSED'>('OPEN');
const modifyPin = ref('');

const statusOptions = [
  { value: 'OPEN' as const, label: '招募中' },
  { value: 'FULL' as const, label: '已满员' },
  { value: 'CLOSED' as const, label: '已关闭' },
];

const shareUrl = computed(() => window.location.href);

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const handleUpdateStatus = async () => {
  await updateMutation.mutateAsync({
    id: id.value,
    status: selectedStatus.value,
    pin: modifyPin.value,
  });

  showModifyModal.value = false;
  modifyPin.value = '';
};
</script>

<style lang="scss" scoped>
.pr-page {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--sys-spacing-med);
  min-height: 100vh;
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
