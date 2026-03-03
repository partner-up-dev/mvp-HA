<template>
  <section class="event-slide event-slide--two">
    <div class="event-half-stack">
      <HomeEventTeaTalkHalf :campaign="teaTalk" />
      <HomeEventSpeakingHalf :campaign="speaking" />
    </div>
  </section>
</template>

<script setup lang="ts">
import HomeEventTeaTalkHalf from "@/widgets/home/HomeEventTeaTalkHalf.vue";
import HomeEventSpeakingHalf from "@/widgets/home/HomeEventSpeakingHalf.vue";
import type { HomeEventCampaignViewModel } from "@/composables/useHomeEventCampaignData";

interface HomeEventSlideTwoProps {
  teaTalk: HomeEventCampaignViewModel;
  speaking: HomeEventCampaignViewModel;
}

defineProps<HomeEventSlideTwoProps>();
</script>

<style lang="scss" scoped>
.event-slide {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.event-half-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.event-half-stack > :deep(*) {
  flex: 1;
}
</style>
