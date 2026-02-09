<template>
  <div class="pin-input-container">
    <label v-if="showLabel" class="label">
      {{ t("pinInput.label") }}
      <span class="hint">{{ t("pinInput.hint") }}</span>
    </label>

    <div class="pin-display">
      <input
        :type="inputType"
        :value="modelValue"
        @input="handleInput"
        @blur="handleBlur"
        class="pin-field"
        :placeholder="t('pinInput.placeholder')"
        inputmode="numeric"
        maxlength="4"
        pattern="\d{4}"
        :disabled="disabled"
      />
      <button
        v-if="allowRegenerate"
        type="button"
        @click="regenerate"
        class="regenerate-btn"
        :title="t('pinInput.regenerateTitle')"
        :disabled="disabled"
      >
        <div class="i-mdi-refresh font-label-large"></div>
      </button>
    </div>

    <p v-if="showInfo" class="info-text">{{ t("pinInput.info") }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import { useUserPRStore } from "@/stores/userPRStore";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    prId?: PRId | null;
    autoGenerate?: boolean;
    allowRegenerate?: boolean;
    inputType?: "text" | "password";
    showLabel?: boolean;
    showInfo?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: "",
    prId: null,
    autoGenerate: true,
    allowRegenerate: true,
    inputType: "text",
    showLabel: true,
    showInfo: true,
    disabled: false,
  },
);
const { t } = useI18n();
const userPRStore = useUserPRStore();
const isHydrating = ref(false);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const generatePIN = () => {
  // Generate cryptographically secure random 4-digit PIN
  const array = new Uint8Array(2);
  crypto.getRandomValues(array);
  const num = (array[0] << 8) | array[1];
  const pin = String(num % 10000).padStart(4, "0");
  return pin;
};

const handleInput = (event: Event) => {
  if (props.disabled) return;
  const target = event.target as HTMLInputElement;
  // Only allow digits
  const value = target.value.replace(/\D/g, "").slice(0, 4);
  emit("update:modelValue", value);
};

const handleBlur = () => {
  // VeeValidate handles validation
};

const regenerate = () => {
  if (props.disabled) return;
  emit("update:modelValue", generatePIN());
};

const hydrateFromStore = (prId: PRId | null) => {
  if (!prId) return false;
  const storedPin = userPRStore.getPRPin(prId);
  if (!storedPin) return false;
  isHydrating.value = true;
  emit("update:modelValue", storedPin);
  isHydrating.value = false;
  return true;
};

const persistPin = (value: string, prId: PRId | null) => {
  if (!prId) return;
  if (value.length !== 4) return;
  userPRStore.setPRPin(prId, value);
};

watch(
  () => props.prId,
  (nextPrId) => {
    if (props.disabled) return;
    if (!nextPrId) return;
    const hydrated = hydrateFromStore(nextPrId);
    if (!hydrated && !props.modelValue && props.autoGenerate) {
      regenerate();
      return;
    }
    if (props.modelValue) {
      persistPin(props.modelValue, nextPrId);
    }
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  (nextValue) => {
    if (isHydrating.value) return;
    if (props.disabled) return;
    if (!props.prId) return;
    if (!nextValue) {
      userPRStore.clearPRPin(props.prId);
      return;
    }
    persistPin(nextValue, props.prId);
  },
);

// Auto-generate on mount if empty and no persisted PIN
onMounted(() => {
  if (props.disabled) return;
  if (props.prId) return;
  if (!props.modelValue && props.autoGenerate) {
    regenerate();
  }
});
</script>

<style scoped lang="scss">
.pin-input-container {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.label {
  font-weight: 600;
  color: var(--sys-color-on-surface);

  .hint {
    font-weight: 400;
    color: var(--sys-color-on-surface-variant);
    font-size: 0.875rem;
  }
}

.pin-display {
  display: flex;
  gap: var(--sys-spacing-sm);
  align-items: center;
}

.pin-field {
  flex: 1;
  padding: 0 var(--sys-spacing-sm);
  height: var(--sys-size-large);
  box-sizing: border-box;
  // background-color: var(--sys-color-surface-container);
  background: transparent;
  color: var(--sys-color-on-surface);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  text-align: center;
  transition: border-color 0.2s;
  letter-spacing: 0.5rem;
  @include mx.pu-font(body-large, true);

  &:focus {
    outline: none;
    border-color: var(--sys-color-primary);
  }
}

.regenerate-btn {
  height: var(--sys-size-large);
  width: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--sys-color-on-surface);

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.info-text {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}
</style>
