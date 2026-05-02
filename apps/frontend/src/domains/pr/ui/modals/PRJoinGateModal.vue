<template>
  <Modal
    :open="open"
    max-width="420px"
    :title="activeGate?.title ?? '加入活动'"
    @close="emit('close')"
  >
    <div class="join-gate-modal">
      <p v-if="loading" class="modal-text">正在读取加入门槛...</p>

      <template v-else-if="activeGate?.kind === 'JOIN_NOTICE'">
        <div class="notice-body">
          {{ activeGate.body }}
        </div>
        <div class="modal-actions">
          <Button
            tone="surface"
            type="button"
            :disabled="pending"
            @click="emit('close')"
          >
            取消
          </Button>
          <Button
            type="button"
            :loading="pending"
            @click="emit('resolve-join-notice', activeGate)"
          >
            同意
          </Button>
        </div>
      </template>

      <template v-else-if="activeGate?.kind === 'BOOKING_CONTACT'">
        <p class="modal-text">
          {{ activeGate.prompt }}
        </p>
        <label class="phone-field">
          <span class="phone-field__label">手机号</span>
          <input
            v-model.trim="phoneInput"
            class="phone-field__input"
            type="tel"
            inputmode="numeric"
            maxlength="11"
            placeholder="请输入 11 位大陆手机号"
            :disabled="pending"
          />
        </label>
        <p v-if="phoneInputError" class="action-error">
          {{ phoneInputError }}
        </p>
        <div class="modal-actions">
          <Button
            tone="surface"
            type="button"
            :disabled="pending"
            @click="emit('close')"
          >
            取消
          </Button>
          <Button
            type="button"
            :loading="pending"
            @click="submitBookingContact(activeGate)"
          >
            提交
          </Button>
        </div>
      </template>

      <template v-else-if="activeGate?.kind === 'FALLBACK_CONFIRM'">
        <p class="modal-text">
          {{ activeGate.prompt }}
        </p>
        <p class="modal-text">加入后即可按流程完成确认与签到。</p>
        <div class="modal-actions">
          <Button
            tone="surface"
            type="button"
            :disabled="pending"
            @click="emit('close')"
          >
            取消
          </Button>
          <Button
            type="button"
            :loading="pending"
            @click="emit('confirm-fallback')"
          >
            确认
          </Button>
        </div>
      </template>

      <p v-else class="modal-text">加入门槛已完成，正在加入...</p>
      <p v-if="error" class="action-error">{{ error }}</p>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import type { PRJoinGateProjectionItem } from "@/domains/pr/queries/usePRJoinGates";

const props = defineProps<{
  open: boolean;
  gates: PRJoinGateProjectionItem[];
  loading: boolean;
  pending: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  close: [];
  "confirm-fallback": [];
  "resolve-join-notice": [
    gate: Extract<PRJoinGateProjectionItem, { kind: "JOIN_NOTICE" }>,
  ];
  "resolve-booking-contact": [
    payload: {
      gate: Extract<PRJoinGateProjectionItem, { kind: "BOOKING_CONTACT" }>;
      phone: string;
    },
  ];
}>();

const CN_MAINLAND_MOBILE_REGEX = /^1\d{10}$/;
const phoneInput = ref("");
const phoneInputError = ref<string | null>(null);

const activeGate = computed(
  () => props.gates.find((gate) => !gate.resolved) ?? null,
);

watch(
  () => activeGate.value?.key ?? null,
  () => {
    phoneInput.value = "";
    phoneInputError.value = null;
  },
);

const submitBookingContact = (
  gate: Extract<PRJoinGateProjectionItem, { kind: "BOOKING_CONTACT" }>,
) => {
  const phone = phoneInput.value.trim();
  if (!phone) {
    phoneInputError.value = "请输入手机号";
    return;
  }
  if (!CN_MAINLAND_MOBILE_REGEX.test(phone)) {
    phoneInputError.value = "请输入 11 位大陆手机号";
    return;
  }
  phoneInputError.value = null;
  emit("resolve-booking-contact", { gate, phone });
};
</script>

<style lang="scss" scoped>
.join-gate-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.modal-text {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.notice-body {
  max-height: min(52vh, 420px);
  overflow: auto;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
  white-space: pre-wrap;
}

.phone-field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.phone-field__label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.phone-field__input {
  width: 100%;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  padding: var(--sys-spacing-small);
  @include mx.pu-font(body-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.modal-actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.modal-actions > button {
  flex: 1 1 140px;
}

.action-error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}
</style>
