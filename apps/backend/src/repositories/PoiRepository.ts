import { inArray } from "drizzle-orm";
import { pois, type Poi } from "../entities/poi";
import { db } from "../lib/db";

const normalizeIds = (ids: string[]): string[] => {
  const set = new Set<string>();
  for (const id of ids) {
    const normalized = id.trim();
    if (!normalized) continue;
    set.add(normalized);
  }
  return Array.from(set);
};

export class PoiRepository {
  async findByIds(ids: string[]): Promise<Poi[]> {
    const normalizedIds = normalizeIds(ids);
    if (normalizedIds.length === 0) {
      return [];
    }

    return await db.select().from(pois).where(inArray(pois.id, normalizedIds));
  }
}
