<template>
  <PRShareCarousel
    v-if="prId !== null && prData !== null && spmRouteKey !== null"
    class="space-m-t-lg space-p-x-sm"
    :share-url="shareUrl"
    :spm-route-key="spmRouteKey"
    :pr-id="prId"
    :pr-data="prData"
  />
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import PRShareCarousel from "@/domains/share/ui/composites/PRShareCarousel.vue";
import type { PRShareData } from "@/domains/share/model/types";
import type { ShareSpmRouteKey } from "@/shared/url/spm";

defineProps<{
  prId: PRId | null;
  shareUrl: string;
  spmRouteKey: ShareSpmRouteKey | null;
  prData: PRShareData | null;
}>();
</script>
