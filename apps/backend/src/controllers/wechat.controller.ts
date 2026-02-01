import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { WeChatJssdkService } from "../services/WeChatJssdkService";

const app = new Hono();
const service = new WeChatJssdkService();

const signatureQuerySchema = z.object({
  url: z.string().min(1),
});

export const wechatRoute = app.get(
  "/jssdk-signature",
  zValidator("query", signatureQuerySchema),
  async (c) => {
    const { url } = c.req.valid("query");

    try {
      // Validate URL early to return 400 rather than 500.
      // WeChat signature uses the full URL without hash.
      new URL(url);
    } catch {
      return c.json({ error: "Invalid url" }, 400);
    }

    try {
      const signature = await service.createSignature(url);
      return c.json(signature);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "WeChat signature failed";
      return c.json({ error: message }, 500);
    }
  },
);
