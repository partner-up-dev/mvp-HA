import { and, desc, eq, inArray } from "drizzle-orm";
import {
  normalizeMeetingPointConfig,
  type MeetingPointConfig,
} from "../entities/meeting-point";
import {
  normalizePoiAvailabilityRules,
  pois,
  type Poi,
  type PoiAvailabilityRule,
  type PoiStatus,
} from "../entities/poi";
import type { UserId } from "../entities/user";
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

  async findByIds(
    ids: string[],
    options: { includeUnpublished?: boolean } = {},
  ): Promise<Poi[]> {
    const normalizedIds = normalizeIds(ids);
    if (normalizedIds.length === 0) {
      return [];
    }

    const filters = [inArray(pois.id, normalizedIds)];
    if (options.includeUnpublished !== true) {
      filters.push(eq(pois.status, "PUBLISHED"));
    }

    return await db
      .select()
      .from(pois)
      .where(and(...filters));
  }

  async findBySubmitter(submitterUserId: UserId): Promise<Poi[]> {
    return await db
      .select()
      .from(pois)
      .where(eq(pois.submittedByUserId, submitterUserId))
      .orderBy(desc(pois.createdAt), desc(pois.updatedAt));
  }

  async upsertById(
    id: string,
    data: {
      gallery: string[];
      status?: PoiStatus;
      perTimeWindowCap?: number | null;
      availabilityRules?: PoiAvailabilityRule[];
      meetingPoint?: MeetingPointConfig | null;
      submittedByUserId?: UserId | null;
      reviewedByUserId?: UserId | null;
      reviewedAt?: Date | null;
      rejectReason?: string | null;
    },
  ): Promise<Poi> {
    const normalizedId = id.trim();
    const normalizedGallery = normalizeGallery(data.gallery);
    const normalizedPerTimeWindowCap =
      data.perTimeWindowCap === undefined ? null : data.perTimeWindowCap;
    const shouldReplaceAvailabilityRules = data.availabilityRules !== undefined;
    const normalizedAvailabilityRules = shouldReplaceAvailabilityRules
      ? normalizePoiAvailabilityRules(data.availabilityRules)
      : [];
    const normalizedMeetingPoint = normalizeMeetingPointConfig(
      data.meetingPoint,
    );

    const result = await db
      .insert(pois)
      .values({
        id: normalizedId,
        status: data.status ?? "PUBLISHED",
        gallery: normalizedGallery,
        perTimeWindowCap: normalizedPerTimeWindowCap,
        availabilityRules: normalizedAvailabilityRules,
        meetingPoint: normalizedMeetingPoint,
        submittedByUserId: data.submittedByUserId ?? null,
        reviewedByUserId: data.reviewedByUserId ?? null,
        reviewedAt: data.reviewedAt ?? null,
        rejectReason: data.rejectReason ?? null,
      })
      .onConflictDoUpdate({
        target: pois.id,
        set: {
          gallery: normalizedGallery,
          perTimeWindowCap: normalizedPerTimeWindowCap,
          ...(data.status ? { status: data.status } : {}),
          ...(shouldReplaceAvailabilityRules
            ? { availabilityRules: normalizedAvailabilityRules }
            : {}),
          meetingPoint: normalizedMeetingPoint,
          ...(data.submittedByUserId !== undefined
            ? { submittedByUserId: data.submittedByUserId }
            : {}),
          ...(data.reviewedByUserId !== undefined
            ? { reviewedByUserId: data.reviewedByUserId }
            : {}),
          ...(data.reviewedAt !== undefined ? { reviewedAt: data.reviewedAt } : {}),
          ...(data.rejectReason !== undefined
            ? { rejectReason: data.rejectReason }
            : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  }

  async createApplication(data: {
    id: string;
    imageUrl: string;
    submittedByUserId: UserId;
  }): Promise<Poi | null> {
    const result = await db
      .insert(pois)
      .values({
        id: data.id.trim(),
        status: "PENDING",
        gallery: [data.imageUrl.trim()].filter(Boolean),
        perTimeWindowCap: null,
        availabilityRules: [],
        meetingPoint: null,
        submittedByUserId: data.submittedByUserId,
        reviewedByUserId: null,
        reviewedAt: null,
        rejectReason: null,
      })
      .onConflictDoNothing()
      .returning();

    return result[0] ?? null;
  }

  async updateReviewState(
    id: string,
    data: {
      status: Extract<PoiStatus, "PUBLISHED" | "REJECTED">;
      reviewedByUserId: UserId | null;
      rejectReason?: string | null;
    },
  ): Promise<Poi | null> {
    const result = await db
      .update(pois)
      .set({
        status: data.status,
        reviewedByUserId: data.reviewedByUserId,
        reviewedAt: new Date(),
        rejectReason: data.status === "REJECTED" ? data.rejectReason ?? null : null,
        updatedAt: new Date(),
      })
      .where(eq(pois.id, id.trim()))
      .returning();

    return result[0] ?? null;
  }
}
