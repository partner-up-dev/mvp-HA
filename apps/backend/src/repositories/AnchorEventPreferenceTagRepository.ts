import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorEventPreferenceTags,
  type AnchorEventId,
  type AnchorEventPreferenceTag,
  type AnchorEventPreferenceTagId,
  type AnchorEventPreferenceTagStatus,
  type NewAnchorEventPreferenceTag,
} from "../entities";

export class AnchorEventPreferenceTagRepository {
  async create(
    data: NewAnchorEventPreferenceTag,
  ): Promise<AnchorEventPreferenceTag> {
    const result = await db
      .insert(anchorEventPreferenceTags)
      .values(data)
      .returning();
    return result[0]!;
  }

  async findById(
    id: AnchorEventPreferenceTagId,
  ): Promise<AnchorEventPreferenceTag | null> {
    const result = await db
      .select()
      .from(anchorEventPreferenceTags)
      .where(eq(anchorEventPreferenceTags.id, id));
    return result[0] ?? null;
  }

  async findByAnchorEventId(
    anchorEventId: AnchorEventId,
  ): Promise<AnchorEventPreferenceTag[]> {
    return await db
      .select()
      .from(anchorEventPreferenceTags)
      .where(eq(anchorEventPreferenceTags.anchorEventId, anchorEventId))
      .orderBy(
        asc(anchorEventPreferenceTags.status),
        asc(anchorEventPreferenceTags.createdAt),
        asc(anchorEventPreferenceTags.id),
      );
  }

  async findByAnchorEventIdAndStatuses(
    anchorEventId: AnchorEventId,
    statuses: AnchorEventPreferenceTagStatus[],
  ): Promise<AnchorEventPreferenceTag[]> {
    if (statuses.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(anchorEventPreferenceTags)
      .where(
        and(
          eq(anchorEventPreferenceTags.anchorEventId, anchorEventId),
          inArray(anchorEventPreferenceTags.status, statuses),
        ),
      )
      .orderBy(
        asc(anchorEventPreferenceTags.status),
        asc(anchorEventPreferenceTags.createdAt),
        asc(anchorEventPreferenceTags.id),
      );
  }

  async update(
    id: AnchorEventPreferenceTagId,
    data: Partial<
      Pick<AnchorEventPreferenceTag, "label" | "description" | "status">
    >,
  ): Promise<AnchorEventPreferenceTag | null> {
    const result = await db
      .update(anchorEventPreferenceTags)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(anchorEventPreferenceTags.id, id))
      .returning();
    return result[0] ?? null;
  }
}
