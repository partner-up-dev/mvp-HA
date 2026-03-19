<template>
  <PageScaffold class="page-scaffold-flow">
    <slot name="header" />

    <main class="page-scaffold-flow__main">
      <slot />
    </main>

    <slot name="actions" />
    <slot name="footer" />
  </PageScaffold>
</template>

<script setup lang="ts">
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
</script>

<style lang="scss" scoped>
.page-scaffold-flow {
  display: flex;
  flex-direction: column;
}

.page-scaffold-flow__main {
  flex: 1;
  min-height: 0;
}
</style>
