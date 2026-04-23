<template>
  <PRRosterModal
    :open="open"
    :pr-id="prId"
    :section="section"
    @close="$emit('close')"
  />
</template>

<script setup lang="ts">
import type { AnchorPRDetailView } from "@/domains/pr/model/types";
import PRRosterModal from "@/domains/pr/ui/modals/PRRosterModal.vue";

type AnchorPartnerSection = AnchorPRDetailView["partnerSection"];

defineEmits<{
  (e: "close"): void;
}>();

defineProps<{
  open: boolean;
  prId: number;
  section: AnchorPartnerSection;
}>();
</script>
