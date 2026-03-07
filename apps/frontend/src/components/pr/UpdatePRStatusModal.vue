<template>
  <Modal
    :open="open"
    max-width="360px"
    :title="t('modifyStatusModal.title')"
    @close="handleClose"
  >
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

    <div v-if="requiresPin" class="pin-input">
      <label>{{ t("modifyStatusModal.pinLabel") }}</label>
      <PinInput
        v-model="modifyPin"
        :auto-generate="false"
        :allow-regenerate="false"
        :show-label="false"
        :show-info="false"
      />
    </div>

    <div class="modal-actions">
      <button class="cancel-btn" @click="handleClose">
        {{ t("common.cancel") }}
      </button>
      <SubmitButton
        :loading="isUpdatePending"
        :disabled="requiresPin && (!modifyPin || modifyPin.length !== 4)"
        @click="handleConfirm"
      >
        {{ t("modifyStatusModal.confirmAction") }}
      </SubmitButton>
    </div>

    <ErrorToast
      v-if="hasUpdateError"
      :message="updateError?.message || t('modifyStatusModal.updateFailed')"
      @close="resetUpdateMutation"
    />
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Modal from "@/components/common/Modal.vue";
import SubmitButton from "@/components/common/SubmitButton.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import PinInput from "@/components/common/PinInput.vue";
import { useUpdateAnchorPRStatus } from "@/queries/useAnchorPR";
import { useUpdateCommunityPRStatus } from "@/queries/useCommunityPR";
import type { PRId, PRKind, PRStatusManual } from "@partner-up-dev/backend";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/stores/userSessionStore";

interface StatusOption {
  value: PRStatusManual;
  label: string;
}

const props = defineProps<{
  open: boolean;
  prId: PRId;
  scenario: PRKind;
}>();
const { t } = useI18n();

const emit = defineEmits<{
  close: [];
}>();

const statusOptions: StatusOption[] = [
  { value: "OPEN", label: t("status.open") },
  { value: "READY", label: t("status.ready") },
  { value: "ACTIVE", label: t("status.active") },
  { value: "CLOSED", label: t("status.closed") },
];

const communityUpdateMutation = useUpdateCommunityPRStatus();
const anchorUpdateMutation = useUpdateAnchorPRStatus();
const userSessionStore = useUserSessionStore();
const selectedStatus = ref<PRStatusManual>("OPEN");
const modifyPin = ref("");
const requiresPin = computed(() => userSessionStore.role === "anonymous");
const getUpdateMutation = () =>
  props.scenario === "ANCHOR" ? anchorUpdateMutation : communityUpdateMutation;
const isUpdatePending = computed(() => getUpdateMutation().isPending.value);
const hasUpdateError = computed(() => getUpdateMutation().isError.value);
const updateError = computed(() => getUpdateMutation().error.value);

const handleClose = () => {
  selectedStatus.value = "OPEN";
  modifyPin.value = "";
  emit("close");
};

const handleConfirm = async () => {
  const pin = requiresPin.value ? modifyPin.value : undefined;
  if (requiresPin.value && (!pin || pin.length !== 4)) {
    return;
  }

  const result = await getUpdateMutation().mutateAsync({
    id: props.prId,
    status: selectedStatus.value,
    pin,
  });

  const authPayload = (result as { auth?: AuthSessionPayload | null }).auth;
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }

  handleClose();
};

const resetUpdateMutation = () => {
  getUpdateMutation().reset();
};
</script>

<style lang="scss" scoped>
.status-options {
  display: flex;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-med);
}

.status-option {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
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
}

.modal-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
}

.cancel-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm);
  min-width: 66px;
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: transparent;
  cursor: pointer;
}
</style>
