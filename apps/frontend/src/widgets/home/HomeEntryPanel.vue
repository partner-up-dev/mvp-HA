<template>
  <main class="main">
    <section class="entry-panel">
      <HomeStructuredCreateCta />
      <HomeNLCreatePanel />
    </section>

    <CreatedPRList empty-mode="hide" />
  </main>
</template>

<script setup lang="ts">
import CreatedPRList from "@/components/pr/CreatedPRList.vue";
import HomeNLCreatePanel from "@/components/home/HomeNLCreatePanel.vue";
import HomeStructuredCreateCta from "@/components/home/HomeStructuredCreateCta.vue";
</script>

<style lang="scss" scoped>
.main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.entry-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-lg);
}
</style>

