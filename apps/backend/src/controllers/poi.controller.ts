import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import type { UserId } from "../entities/user";
import {
  listMyPoiApplications,
  submitPoiApplication,
} from "../domains/poi";
import { PoiRepository } from "../repositories/PoiRepository";

const app = new Hono<AuthEnv>();
const poiRepo = new PoiRepository();

const byIdsQuerySchema = z.object({
  ids: z.string().min(1),
});

const poiApplicationSchema = z.object({
  title: z.string().trim().min(1).max(80),
  imageUrl: z.string().trim().url().max(2048),
});

const requireSessionUserId = (c: Context<AuthEnv>): UserId => {
  const auth = c.get("auth");
  if (!auth.userId) {
    throw new HTTPException(401, { message: "Authentication required" });
  }
  return auth.userId as UserId;
};

const normalizeCsvIds = (csv: string): string[] => {
  const set = new Set<string>();
  for (const raw of csv.split(",")) {
    const id = raw.trim();
    if (!id) continue;
    set.add(id);
  }
  return Array.from(set);
};

export const poiRoute = app
  .use("*", authMiddleware)
  .get("/by-ids", zValidator("query", byIdsQuerySchema), async (c) => {
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
  .post("/applications", zValidator("json", poiApplicationSchema), async (c) => {
    const userId = requireSessionUserId(c);
    const payload = c.req.valid("json");
    const application = await submitPoiApplication({
      title: payload.title,
      imageUrl: payload.imageUrl,
      submittedByUserId: userId,
    });
    return c.json(application, 201);
  })
  .get("/applications/mine", async (c) => {
    const userId = requireSessionUserId(c);
    const applications = await listMyPoiApplications(userId);
    return c.json(applications);
  });
