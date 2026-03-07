import { computed, type ComputedRef } from "vue";
import { usePoisByIds } from "@/queries/usePoisByIds";

export const usePRLocationGallery = (
  location: ComputedRef<string | null>,
) => {
  const locationId = computed(() => {
    const value = location.value;
    if (!value) return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  });

  const poiIdsCsv = computed(() => locationId.value);
  const { data: poisByIdsData } = usePoisByIds(poiIdsCsv);

  const locationGallery = computed(() => {
    const targetLocationId = locationId.value;
    if (!targetLocationId) {
      return [];
    }

    const matchedPoi = (poisByIdsData.value ?? []).find(
      (poi) => poi.id === targetLocationId,
    );
    if (!matchedPoi) {
      return [];
    }

    return matchedPoi.gallery
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  });

  return {
    locationGallery,
  };
};
