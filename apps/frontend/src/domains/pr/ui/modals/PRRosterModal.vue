<template>
  <AnchorPRRosterModal
    :open="open"
    :pr-id="prId"
    :section="section"
    @close="$emit('close')"
  />
</template>

<script setup lang="ts">
import type { AnchorPRDetailView } from "@/domains/pr/model/types";
import AnchorPRRosterModal from "@/domains/pr/ui/modals/AnchorPRRosterModal.vue";

type PartnerSection = AnchorPRDetailView["partnerSection"];

defineEmits<{
  (e: "close"): void;
}>();

defineProps<{
  open: boolean;
  prId: number;
  section: PartnerSection;
}>();
</script>
