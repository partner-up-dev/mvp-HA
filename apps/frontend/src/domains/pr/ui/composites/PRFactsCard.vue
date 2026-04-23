<template>
  <AnchorPRFactsCard
    :pr-id="prId"
    :notes="notes"
    :location="location"
    :time-text="timeText"
    :preferences="preferences"
    :participant-overview-text="participantOverviewText"
    :roster-preview="rosterPreview"
    :has-more-roster="hasMoreRoster"
    :location-gallery-available="locationGalleryAvailable"
    @view-location-gallery="$emit('view-location-gallery')"
    @view-roster="$emit('view-roster')"
  />
</template>

<script setup lang="ts">
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";
import AnchorPRFactsCard from "@/domains/pr/ui/composites/AnchorPRFactsCard.vue";

type RosterPreviewItem =
  AnchorPRDetailResponse["partnerSection"]["roster"][number];

defineEmits<{
  (e: "view-location-gallery"): void;
  (e: "view-roster"): void;
}>();

defineProps<{
  prId: number;
  notes: string | null;
  location: string | null;
  timeText: string;
  preferences: string[];
  participantOverviewText: string;
  rosterPreview: readonly RosterPreviewItem[];
  hasMoreRoster: boolean;
  locationGalleryAvailable?: boolean;
}>();
</script>
