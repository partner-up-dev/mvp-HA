<template>
  <div class="pr-input">
    <!-- <label for="pr-text">{{ t("prInput.label") }}</label> -->
    <textarea
      id="pr-text"
      :value="modelValue"
      @input="
        $emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
      :disabled="disabled"
      :placeholder="placeholder"
      rows="3"
      maxlength="120"
    />
    <span class="char-count">{{ (modelValue || "").length }} / 120</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    modelValue: "",
    placeholder: "",
  },
);

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<style lang="scss" scoped>
.pr-input {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  label {
    @include mx.pu-font(label-large);
    color: var(--sys-color-on-surface);
  }

  textarea {
    @include mx.pu-font(body-large);
    padding: var(--sys-spacing-med);
    border: 1px solid var(--sys-color-outline);
    border-radius: var(--sys-radius-xs);
    // background: var(--sys-color-surface-container);
    background: transparent;
    color: var(--sys-color-on-surface);
    resize: vertical;
    min-height: 120px;

    &::placeholder {
      color: var(--sys-color-on-surface-variant);
    }

    &:focus {
      outline: none;
      border-color: var(--sys-color-primary);
    }

    &:disabled {
      opacity: var(--sys-opacity-disabled);
    }
  }

  .char-count {
    @include mx.pu-font(label-small);
    color: var(--sys-color-on-surface-variant);
    text-align: right;
  }
}
</style>
