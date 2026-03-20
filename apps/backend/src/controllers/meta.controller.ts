import { Hono } from "hono";
import { buildMetadata } from "../lib/build-metadata";

const app = new Hono();

export const metaRoute = app.get("/build", async (c) => {
  return c.json(buildMetadata);
});
