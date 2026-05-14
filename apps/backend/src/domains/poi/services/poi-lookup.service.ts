import type { Poi } from "../../../entities/poi";
import { PoiRepository } from "../../../repositories/PoiRepository";

const poiRepo = new PoiRepository();

export type PoiLookupOptions = {
  includeUnpublished?: boolean;
};

export const findPoiById = async (
  id: number,
  options: PoiLookupOptions = {},
): Promise<Poi | null> => poiRepo.findById(id, options);

export const findPoisByIds = async (
  ids: number[],
  options: PoiLookupOptions = {},
): Promise<Poi[]> => poiRepo.findByIds(ids, options);

export const findPoiByName = async (
  name: string,
  options: PoiLookupOptions = {},
): Promise<Poi | null> => poiRepo.findByName(name, options);

export const findPoisByNames = async (
  names: string[],
  options: PoiLookupOptions = {},
): Promise<Poi[]> => poiRepo.findByNames(names, options);

export const resolvePublishedPoiByLocation = async (
  location: string | null | undefined,
): Promise<Poi | null> => {
  const name = location?.trim() ?? "";
  if (!name) {
    return null;
  }

  return findPoiByName(name);
};
