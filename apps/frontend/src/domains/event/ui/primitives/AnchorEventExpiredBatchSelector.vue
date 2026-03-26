<template>
  <div class="expired-batch-selector">
    <button
      v-for="option in options"
      :key="option.batchId"
      type="button"
      class="expired-batch-selector__option"
      @click="emit('select', option.batchId)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
type ExpiredBatchOption = {
  batchId: number;
  label: string;
};

defineProps<{
  options: ExpiredBatchOption[];
}>();

const emit = defineEmits<{
  select: [batchId: number];
}>();
</script>

<style lang="scss" scoped>
.expired-batch-selector {
  min-width: 180px;
  background: var(--sys-color-surface-container-high);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-md);
  padding: var(--sys-spacing-xs);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.expired-batch-selector__option {
  @include mx.pu-font(label-medium);
  border: none;
  background: transparent;
  text-align: left;
  color: var(--sys-color-on-surface);
  border-radius: var(--sys-radius-sm);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  cursor: pointer;

  &:hover {
    background: var(--sys-color-surface-container-highest);
  }
}
</style>
