import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { PoiRepository } from "../repositories/PoiRepository";

const app = new Hono();
const poiRepo = new PoiRepository();

const byIdsQuerySchema = z.object({
  ids: z.string().min(1),
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

export const poiRoute = app.get(
  "/by-ids",
  zValidator("query", byIdsQuerySchema),
  async (c) => {
    const { ids } = c.req.valid("query");
    const normalizedIds = normalizeCsvIds(ids);
    const pois = await poiRepo.findByIds(normalizedIds);

    return c.json(
      pois.map((poi) => ({
        id: poi.id,
        gallery: poi.gallery,
      })),
    );
  },
);
