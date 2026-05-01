import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { meetingPointConfigSchema } from "../entities/meeting-point";
import { poiAvailabilityRulesSchema } from "../entities/poi";
import {
  adminAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";
import { PoiRepository } from "../repositories/PoiRepository";
import {
  captureEffectiveMeetingPointsForRequests,
  listRequestsAffectedByPoiMeetingPoint,
  scheduleMeetingPointNotificationsForChangedRequests,
} from "../domains/pr/services";

const app = new Hono<AdminAuthEnv>();
const poiRepo = new PoiRepository();

const byIdsQuerySchema = z.object({
  ids: z.string().min(1),
});

const poiIdParamSchema = z.object({
  poiId: z.string().trim().min(1),
});

const upsertPoiSchema = z.object({
  gallery: z.array(z.string().trim().min(1)),
  perTimeWindowCap: z.number().int().positive().nullable().optional(),
  availabilityRules: poiAvailabilityRulesSchema.optional(),
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
});

const normalizeCsvIds = (csv: string): string[] => {
  const set = new Set<string>();
  for (const raw of csv.split(",")) {
    const id = raw.trim();
    if (!id) continue;
    set.add(id);
  }
  return Array.from(set);
};

export const adminPoiRoute = app
  .use("*", adminAuthMiddleware)
  .get("/pois", async (c) => {
    const pois = await poiRepo.listAll();
    return c.json(
      pois.map((poi) => ({
        id: poi.id,
        gallery: poi.gallery,
        perTimeWindowCap: poi.perTimeWindowCap,
        availabilityRules: poi.availabilityRules,
        meetingPoint: poi.meetingPoint,
      })),
    );
  })
  .get("/pois/by-ids", zValidator("query", byIdsQuerySchema), async (c) => {
    const { ids } = c.req.valid("query");
    const normalizedIds = normalizeCsvIds(ids);
    const pois = await poiRepo.findByIds(normalizedIds);

    return c.json(
      pois.map((poi) => ({
        id: poi.id,
        gallery: poi.gallery,
        perTimeWindowCap: poi.perTimeWindowCap,
        availabilityRules: poi.availabilityRules,
        meetingPoint: poi.meetingPoint,
      })),
    );
  })
  .put(
    "/pois/:poiId",
    zValidator("param", poiIdParamSchema),
    zValidator("json", upsertPoiSchema),
    async (c) => {
      const { poiId } = c.req.valid("param");
      const { gallery, perTimeWindowCap, availabilityRules, meetingPoint } =
        c.req.valid("json");
      const [existingPoi] =
        availabilityRules === undefined || meetingPoint === undefined
          ? await poiRepo.findByIds([poiId])
          : [];
      const affectedRequests =
        await listRequestsAffectedByPoiMeetingPoint(poiId);
      const previousMeetingPoints =
        await captureEffectiveMeetingPointsForRequests(affectedRequests);
      const updatedAt = new Date();

      const poi = await poiRepo.upsertById(poiId, {
        gallery,
        perTimeWindowCap: perTimeWindowCap ?? null,
        availabilityRules: availabilityRules ?? existingPoi?.availabilityRules ?? [],
        meetingPoint: meetingPoint ?? existingPoi?.meetingPoint ?? null,
      });
      await scheduleMeetingPointNotificationsForChangedRequests({
        previous: previousMeetingPoints,
        requests: affectedRequests,
        updatedAt,
      });
      return c.json({
        id: poi.id,
        gallery: poi.gallery,
        perTimeWindowCap: poi.perTimeWindowCap,
        availabilityRules: poi.availabilityRules,
        meetingPoint: poi.meetingPoint,
      });
    },
  );
