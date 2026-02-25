<template>
  <PRShareCarousel
    v-if="prId !== null && prData !== null"
    class="space-m-t-lg space-p-x-sm"
    :share-url="shareUrl"
    :pr-id="prId"
    :pr-data="prData"
  />
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import PRShareCarousel from "@/components/share/PRShareCarousel.vue";
import type { PRShareData } from "@/components/share/types";

defineProps<{
  prId: PRId | null;
  shareUrl: string;
  prData: PRShareData | null;
}>();
</script>

