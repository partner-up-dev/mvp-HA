<template>
  <div class="error-toast" :class="{ persistent }">
    <span class="icon">!</span>
    <p>{{ message }}</p>
    <button v-if="!persistent" class="close" @click="$emit('close')">&times;</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
  persistent?: boolean;
}>();

defineEmits<{
  close: [];
}>();
</script>

<style lang="scss" scoped>
.error-toast {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  background: var(--sys-color-error-container);
  color: var(--sys-color-on-error-container);
  border-radius: var(--sys-radius-med);

  .icon {
    @include mx.flex-center;
    width: 24px;
    height: 24px;
    background: var(--sys-color-error);
    color: var(--sys-color-on-error);
    border-radius: 50%;
    font-weight: bold;
  }

  p {
    @include mx.pu-font(body-large);
    flex: 1;
  }

  .close {
    @include mx.pu-font(title-medium);
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: var(--sys-spacing-xs);
  }
}
</style>
