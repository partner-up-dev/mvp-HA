import { Hono } from "hono";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { getMyCreatedPRs, getMyJoinedPRs } from "../domains/pr-core";
import { requireAuthenticatedUserId } from "./pr-controller.shared";

const app = new Hono<AuthEnv>();

export const partnerRequestRoute = app
  .use("*", authMiddleware)
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
