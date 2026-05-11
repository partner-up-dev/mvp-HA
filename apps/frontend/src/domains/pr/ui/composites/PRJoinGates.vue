<template>
  <div class="join-gates">
    <p v-if="loading" class="gate-text">正在读取前置项...</p>

    <template v-else-if="activeGate?.kind === 'JOIN_NOTICE'">
      <h3 class="gate-title">{{ activeGate.title }}</h3>
      <div class="notice-body">
        {{ activeGate.body }}
      </div>
      <div class="gate-actions">
        <Button
          tone="surface"
          type="button"
          :disabled="interactionPending"
          @click="emit('cancel')"
        >
          取消
        </Button>
        <Button
          type="button"
          :loading="interactionPending"
          @click="resolveJoinNotice(activeGate)"
        >
          同意
        </Button>
      </div>
    </template>

    <template v-else-if="activeGate?.kind === 'BOOKING_CONTACT'">
      <h3 class="gate-title">{{ activeGate.title }}</h3>
      <p class="gate-text">
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
          :disabled="interactionPending"
          data-testid="pr-detail.join-gate.booking-contact.input"
        />
      </label>
      <p v-if="phoneInputError" class="action-error">
        {{ phoneInputError }}
      </p>
      <div class="gate-actions">
        <Button
          tone="surface"
          type="button"
          :disabled="interactionPending"
          @click="emit('cancel')"
        >
          取消
        </Button>
        <Button
          type="button"
          :loading="interactionPending"
          data-testid="pr-detail.join-gate.booking-contact.submit"
          @click="resolveBookingContact(activeGate)"
        >
          提交
        </Button>
      </div>
    </template>

    <component
      :is="fallbackConfirmGate"
      v-else-if="showFallbackConfirm"
      :pending="interactionPending"
      @cancel="emit('cancel')"
      @confirm="emitCompletedOnce"
    />

    <p v-if="visibleError" class="action-error">{{ visibleError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import {
  usePRJoinGates,
  type PRJoinGateProjectionItem,
  type ResolvePRJoinGateResponse,
} from "@/domains/pr/queries/usePRJoinGates";

type JoinNoticeGate = Extract<
  PRJoinGateProjectionItem,
  { kind: "JOIN_NOTICE" }
>;
type BookingContactGate = Extract<
  PRJoinGateProjectionItem,
  { kind: "BOOKING_CONTACT" }
>;

const props = defineProps<{
  prId: PRId | null;
  enabled: boolean;
  pending: boolean;
  error: string | null;
  fallbackConfirmGate: Component;
}>();

const emit = defineEmits<{
  cancel: [];
  completed: [];
  error: [message: string];
  resolved: [result: ResolvePRJoinGateResponse];
}>();

const { t } = useI18n();
const CN_MAINLAND_MOBILE_REGEX = /^1\d{10}$/;
const phoneInput = ref("");
const phoneInputError = ref<string | null>(null);
const completionEmitted = ref(false);
const prIdRef = computed(() => props.prId);
const enabledRef = computed(() => props.enabled);
const joinGatesQuery = usePRJoinGates(prIdRef, enabledRef);

const gates = computed(() => joinGatesQuery.data.value?.gates ?? []);
const activeGate = computed(
  () => gates.value.find((gate) => !gate.resolved) ?? null,
);
const loading = computed(
  () =>
    props.enabled &&
    joinGatesQuery.isFetching.value &&
    joinGatesQuery.data.value === undefined,
);
const interactionPending = computed(
  () =>
    props.pending ||
    joinGatesQuery.isFetching.value ||
    joinGatesQuery.resolveGate.isPending.value,
);
const queryErrorMessage = computed(() => {
  const error = joinGatesQuery.error.value;
  return error instanceof Error ? error.message : null;
});
const visibleError = computed(
  () => props.error ?? queryErrorMessage.value ?? null,
);
const showFallbackConfirm = computed(
  () =>
    props.enabled &&
    !loading.value &&
    !queryErrorMessage.value &&
    gates.value.length === 0,
);
const allConfiguredGatesResolved = computed(
  () =>
    props.enabled &&
    !loading.value &&
    !queryErrorMessage.value &&
    gates.value.length > 0 &&
    activeGate.value === null,
);

const emitCompletedOnce = (): void => {
  if (completionEmitted.value) return;
  completionEmitted.value = true;
  emit("completed");
};

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : t("common.operationFailed");

const resolveJoinNotice = async (gate: JoinNoticeGate): Promise<void> => {
  if (props.prId === null || interactionPending.value) return;
  try {
    const result = await joinGatesQuery.resolveGate.mutateAsync({
      id: props.prId,
      gateKey: gate.key,
      payload: {
        kind: "JOIN_NOTICE",
        version: gate.version,
        accepted: true,
      },
    });
    emit("resolved", result);
  } catch (error) {
    emit("error", resolveErrorMessage(error));
  }
};

const resolveBookingContact = async (
  gate: BookingContactGate,
): Promise<void> => {
  if (props.prId === null || interactionPending.value) return;
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
  try {
    const result = await joinGatesQuery.resolveGate.mutateAsync({
      id: props.prId,
      gateKey: gate.key,
      payload: {
        kind: "BOOKING_CONTACT",
        version: gate.version,
        phone,
      },
    });
    emit("resolved", result);
  } catch (error) {
    emit("error", resolveErrorMessage(error));
  }
};

watch(
  () => [props.enabled, props.prId] as const,
  () => {
    completionEmitted.value = false;
    phoneInput.value = "";
    phoneInputError.value = null;
    joinGatesQuery.resolveGate.reset();
  },
);

watch(
  () => activeGate.value?.key ?? null,
  () => {
    phoneInput.value = "";
    phoneInputError.value = null;
  },
);

watch(queryErrorMessage, (message) => {
  if (message) {
    emit("error", message);
  }
});

watch(allConfiguredGatesResolved, (resolved) => {
  if (resolved) {
    emitCompletedOnce();
  }
});
</script>

<style lang="scss" scoped>
.join-gates {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.gate-title {
  margin: 0;
  @include mx.pu-font(title-medium);
  color: var(--sys-color-on-surface);
}

.gate-text {
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

.gate-actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.gate-actions > button {
  flex: 1 1 140px;
}

.action-error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}
</style>
