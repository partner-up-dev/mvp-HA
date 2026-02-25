<template>
  <div class="home-page">
    <HomeHero />
    <HomeEntryPanel />
    <HomeContactEntry />
  </div>
</template>

<script setup lang="ts">
import HomeHero from "@/widgets/home/HomeHero.vue";
import HomeEntryPanel from "@/widgets/home/HomeEntryPanel.vue";
import HomeContactEntry from "@/widgets/home/HomeContactEntry.vue";
</script>

<style lang="scss" scoped>
.home-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}
</style>
