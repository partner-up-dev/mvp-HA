<template>
  <AnchorPRMessageThread
    :pr-id="prId"
    :show-header="showHeader"
    :layout="layout"
  />
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import AnchorPRMessageThread from "@/domains/pr/ui/sections/AnchorPRMessageThread.vue";

withDefaults(
  defineProps<{
    prId: PRId;
    showHeader?: boolean;
    layout?: "card" | "page";
  }>(),
  {
    showHeader: true,
    layout: "card",
  },
);
</script>
