<template>
  <div class="pr-input">
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
    <span class="char-count">{{ (modelValue || '').length }} / 120</span>
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

  textarea {
    @include mx.pu-font(body-large);
    @include mx.pu-form-control(plain);
    padding: var(--sys-spacing-med);
    border-radius: var(--sys-radius-xs);
    resize: vertical;
    min-height: 120px;

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
