<template>
  <div class="pin-input-container">
    <label class="label">
      PIN码
      <span class="hint">(4位数字)</span>
    </label>

    <div class="pin-display">
      <input
        type="text"
        :value="modelValue"
        @input="handleInput"
        @blur="handleBlur"
        class="pin-field"
        placeholder="••••"
        inputmode="numeric"
        maxlength="4"
        pattern="\d{4}"
      />
      <button
        type="button"
        @click="regenerate"
        class="regenerate-btn"
        title="重新生成"
      >
        <div class="i-mdi-refresh font-label-large"></div>
      </button>
    </div>

    <p class="info-text">📋 修改状态时您会需要，请保存好此 PIN 码</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
  }>(),
  {
    modelValue: "",
  },
);

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
  const target = event.target as HTMLInputElement;
  // Only allow digits
  const value = target.value.replace(/\D/g, "").slice(0, 4);
  emit("update:modelValue", value);
};

const handleBlur = () => {
  // VeeValidate handles validation
};

const regenerate = () => {
  emit("update:modelValue", generatePIN());
};

// Auto-generate on mount if empty
onMounted(() => {
  if (!props.modelValue) {
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
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  font-family: monospace;
  font-size: 1.2rem;
  letter-spacing: 0.5rem;
  text-align: center;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--sys-color-primary);
    box-shadow: 0 0 0 2px var(--sys-color-primary-container);
  }
}

.regenerate-btn {
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface);
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.1);
    background: var(--sys-color-surface-variant);
  }

  &:active {
    transform: scale(0.95);
  }
}

.info-text {
  font-size: 0.875rem;
  color: var(--sys-color-on-surface-variant);
}
</style>
