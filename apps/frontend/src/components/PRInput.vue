<template>
  <div class="pr-input">
    <label for="pr-text">描述你的搭子需求</label>
    <textarea
      id="pr-text"
      :value="modelValue"
      @input="
        $emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
      :disabled="disabled"
      placeholder="例如：周末想找人一起去杭州玩两天，预算500左右，希望对方喜欢拍照..."
      rows="5"
      maxlength="2000"
    />
    <span class="char-count">{{ (modelValue || "").length }} / 2000</span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: "",
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
