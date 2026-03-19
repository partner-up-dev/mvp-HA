import { computed, type Ref } from "vue";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";

export const usePRLocationGallery = (
  location: Ref<string | null | undefined>,
) => {
  const locationId = computed(() => {
    const rawLocation = location.value;
    if (!rawLocation) return null;
    const normalized = rawLocation.trim();
    return normalized.length > 0 ? normalized : null;
  });

  const poiIdsCsv = computed(() => locationId.value);
  const { data: poisByIdsData } = usePoisByIds(poiIdsCsv);

  const locationGallery = computed(() => {
    const targetLocationId = locationId.value;
    if (!targetLocationId) return [];

    const matchedPoi = (poisByIdsData.value ?? []).find(
      (poi) => poi.id === targetLocationId,
    );
    if (!matchedPoi) return [];

    return matchedPoi.gallery
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  });

  return {
    locationId,
    locationGallery,
  };
};
