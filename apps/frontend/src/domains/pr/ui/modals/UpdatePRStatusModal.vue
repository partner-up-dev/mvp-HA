<template>
  <Modal
    :open="open"
    max-width="360px"
    :title="t('modifyStatusModal.title')"
    @close="handleClose"
  >
    <div class="status-options">
      <ChoiceCard
        v-for="status in statusOptions"
        :key="status.value"
        class="status-option"
        :active="selectedStatus === status.value"
        @click="selectedStatus = status.value"
      >
        {{ status.label }}
      </ChoiceCard>
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
      <Button tone="outline" @click="handleClose">
        {{ t("common.cancel") }}
      </Button>
      <Button
        :loading="isUpdatePending"
        :disabled="requiresPin && (!modifyPin || modifyPin.length !== 4)"
        @click="handleConfirm"
      >
        {{ t("modifyStatusModal.confirmAction") }}
      </Button>
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
import Modal from "@/shared/ui/overlay/Modal.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PinInput from "@/shared/ui/forms/PinInput.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import { useUpdatePRStatus } from "@/domains/pr/queries/usePRActions";
import type { PRId, PRStatusManual } from "@partner-up-dev/backend";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import type { PRScenario } from "@/domains/pr/model/types";

interface StatusOption {
  value: PRStatusManual;
  label: string;
}

const props = defineProps<{
  open: boolean;
  prId: PRId;
  scenario: PRScenario;
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

const updateMutation = useUpdatePRStatus();
const userSessionStore = useUserSessionStore();
const selectedStatus = ref<PRStatusManual>("OPEN");
const modifyPin = ref("");
const requiresPin = computed(() => userSessionStore.role === "anonymous");
const isUpdatePending = computed(() => updateMutation.isPending.value);
const updateError = computed(() => updateMutation.getError(props.scenario));
const hasUpdateError = computed(() => Boolean(updateError.value));

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

  const result = await updateMutation.mutateAsync({
    scenario: props.scenario,
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
  updateMutation.reset(props.scenario);
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
  justify-content: center;
  min-width: 0;
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

  :deep(.ui-button) {
    flex: 1;
    min-width: 66px;
  }
}

</style>
