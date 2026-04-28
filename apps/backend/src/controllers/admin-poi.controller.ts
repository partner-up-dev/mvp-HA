import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  adminAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";
import { PoiRepository } from "../repositories/PoiRepository";

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
      })),
    );
  })
  .put(
    "/pois/:poiId",
    zValidator("param", poiIdParamSchema),
    zValidator("json", upsertPoiSchema),
    async (c) => {
      const { poiId } = c.req.valid("param");
      const { gallery, perTimeWindowCap } = c.req.valid("json");

      const poi = await poiRepo.upsertById(poiId, {
        gallery,
        perTimeWindowCap: perTimeWindowCap ?? null,
      });
      return c.json({
        id: poi.id,
        gallery: poi.gallery,
        perTimeWindowCap: poi.perTimeWindowCap,
      });
    },
  );
