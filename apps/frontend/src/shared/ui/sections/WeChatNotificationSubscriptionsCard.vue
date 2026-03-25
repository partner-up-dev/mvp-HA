<template>
  <section class="section-card">
    <h2 class="section-title">{{ title }}</h2>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style scoped lang="scss">
.section-card {
  @include mx.pu-surface-card(section);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.section-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}
</style>
