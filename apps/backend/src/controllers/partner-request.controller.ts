import { Hono } from "hono";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  createPRFromNaturalLanguage,
  createPRFromStructured,
  getMyCreatedPRs,
  getMyJoinedPRs,
} from "../domains/pr-core";
import {
  buildCreatorIdentity,
  createStructuredPRSchema,
  nlWordCountSchema,
  requireAuthenticatedUserId,
} from "./pr-controller.shared";
import { zValidator } from "@hono/zod-validator";

const app = new Hono<AuthEnv>();

export const partnerRequestRoute = app
  .use("*", authMiddleware)
  .post("/new/form", zValidator("json", createStructuredPRSchema), async (c) => {
    const fields = c.req.valid("json");
    const creatorIdentity = await buildCreatorIdentity(c);
    const result = await createPRFromStructured(fields, creatorIdentity);

    return c.json(
      {
        id: result.id,
      },
      201,
    );
  })
  .post("/new/nl", zValidator("json", nlWordCountSchema), async (c) => {
    const { rawText, nowIso, nowWeekday } = c.req.valid("json");
    const creatorIdentity = await buildCreatorIdentity(c);
    const result = await createPRFromNaturalLanguage(
      rawText,
      nowIso,
      nowWeekday ?? null,
      creatorIdentity,
    );

    return c.json(
      {
        id: result.id,
      },
      201,
    );
  })
  .get("/mine/created", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const items = await getMyCreatedPRs(userId);
    return c.json(items);
  })
  .get("/mine/joined", async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const items = await getMyJoinedPRs(userId);
    return c.json(items);
  });
