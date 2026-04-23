<template>
  <PRFactsCard
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
import type { AnchorPRDetailView } from "@/domains/pr/model/types";
import PRFactsCard from "@/domains/pr/ui/composites/PRFactsCard.vue";

type RosterPreviewItem =
  AnchorPRDetailView["partnerSection"]["roster"][number];

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
