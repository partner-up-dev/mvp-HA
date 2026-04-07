const normalizeGallery = (gallery: readonly string[]): string[] =>
  gallery
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

export const toPoiGalleryMap = (
  pois: ReadonlyArray<{ id: string; gallery: readonly string[] }>,
): Map<string, string[]> => {
  const map = new Map<string, string[]>();

  for (const poi of pois) {
    const poiId = poi.id.trim();
    if (!poiId) {
      continue;
    }

    const gallery = normalizeGallery(poi.gallery);
    if (gallery.length === 0) {
      continue;
    }

    map.set(poiId, gallery);
  }

  return map;
};

export const pickRandomPoiGalleryImage = (
  gallery: readonly string[],
): string | null => {
  const normalizedGallery = normalizeGallery(gallery);
  if (normalizedGallery.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * normalizedGallery.length);
  return normalizedGallery[randomIndex] ?? null;
};
