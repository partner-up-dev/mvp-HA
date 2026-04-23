<template>
  <AnchorPRRosterModal
    :open="open"
    :pr-id="prId"
    :section="section"
    @close="$emit('close')"
  />
</template>

<script setup lang="ts">
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";
import AnchorPRRosterModal from "@/domains/pr/ui/modals/AnchorPRRosterModal.vue";

type PartnerSection = AnchorPRDetailResponse["partnerSection"];

defineEmits<{
  (e: "close"): void;
}>();

defineProps<{
  open: boolean;
  prId: number;
  section: PartnerSection;
}>();
</script>
