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

const normalizeGallery = (gallery: string[]): string[] => {
  const set = new Set<string>();
  for (const item of gallery) {
    const normalized = item.trim();
    if (!normalized) continue;
    set.add(normalized);
  }
  return Array.from(set);
};

export class PoiRepository {
  async listAll(): Promise<Poi[]> {
    return await db.select().from(pois);
  }

  async findByIds(ids: string[]): Promise<Poi[]> {
    const normalizedIds = normalizeIds(ids);
    if (normalizedIds.length === 0) {
      return [];
    }

    return await db.select().from(pois).where(inArray(pois.id, normalizedIds));
  }

  async upsertById(id: string, gallery: string[]): Promise<Poi> {
    const normalizedId = id.trim();
    const normalizedGallery = normalizeGallery(gallery);

    const result = await db
      .insert(pois)
      .values({
        id: normalizedId,
        gallery: normalizedGallery,
      })
      .onConflictDoUpdate({
        target: pois.id,
        set: {
          gallery: normalizedGallery,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  }
}
