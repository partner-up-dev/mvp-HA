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
        pattern="\\d{4}"
        :disabled="disabled"
      />
      <Button
        v-if="allowRegenerate"
        class="regenerate-btn"
        tone="outline"
        size="sm"
        type="button"
        @click="regenerate"
        :title="t('pinInput.regenerateTitle')"
        :disabled="disabled"
      >
        <div class="i-mdi-refresh font-label-large"></div>
      </Button>
    </div>

    <p v-if="showInfo" class="info-text">{{ t("pinInput.info") }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    autoGenerate?: boolean;
    allowRegenerate?: boolean;
    inputType?: "text" | "password";
    showLabel?: boolean;
    showInfo?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: "",
    autoGenerate: true,
    allowRegenerate: true,
    inputType: "text",
    showLabel: true,
    showInfo: true,
    disabled: false,
  },
);
const { t } = useI18n();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const generatePIN = () => {
  const array = new Uint8Array(2);
  crypto.getRandomValues(array);
  const num = (array[0] << 8) | array[1];
  return String(num % 10000).padStart(4, "0");
};

const handleInput = (event: Event) => {
  if (props.disabled) return;
  const target = event.target as HTMLInputElement;
  const value = target.value.replace(/\D/g, "").slice(0, 4);
  emit("update:modelValue", value);
};

const handleBlur = () => {};

const regenerate = () => {
  if (props.disabled) return;
  emit("update:modelValue", generatePIN());
};

onMounted(() => {
  if (props.disabled) return;
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
  width: 100%;
  border: 1px solid var(--sys-color-outline);
  color: var(--sys-color-on-surface);
  background: transparent;
  padding: 0 var(--sys-spacing-sm);
  height: var(--sys-size-large);
  box-sizing: border-box;
  border-radius: var(--sys-radius-sm);
  text-align: center;
  transition: border-color 0.2s;
  letter-spacing: 0.5rem;
  @include mx.pu-font(body-large, true);

  &::placeholder {
    color: var(--sys-color-on-surface-variant);
    opacity: 0.6;
  }

  &:focus {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: -1px;
  }
}

.regenerate-btn {
  height: var(--sys-size-large);
  width: var(--sys-size-large);
}

.info-text {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}
</style>
