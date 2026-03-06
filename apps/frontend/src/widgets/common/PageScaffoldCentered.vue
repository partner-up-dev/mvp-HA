<template>
  <PageScaffold class="page-scaffold-centered">
    <slot name="header" />

    <main class="page-scaffold-centered__main">
      <slot />
    </main>

    <slot name="actions" />
    <slot name="footer" />
  </PageScaffold>
</template>

<script setup lang="ts">
import PageScaffold from "@/widgets/common/PageScaffold.vue";
</script>

<style lang="scss" scoped>
.page-scaffold-centered {
  display: flex;
  flex-direction: column;
}

.page-scaffold-centered__main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-med);
}
</style>
