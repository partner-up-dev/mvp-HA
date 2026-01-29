import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { parsedPRSchema } from "../entities/partner-request";
import { LLMService, XiaohongshuStyle } from "../services/LLMService";

const app = new Hono();
const llmService = new LLMService();

// POST /api/llm/xiaohongshu-caption - Generate Xiaohongshu caption
const generateCaptionSchema = parsedPRSchema.extend({
  style: z
    .enum(["friendly", "concise", "warm", "trendy", "professional"])
    .optional(),
});

export const llmRoute = app.post(
  "/xiaohongshu-caption",
  zValidator("json", generateCaptionSchema),
  async (c) => {
    const { style, ...prData } = c.req.valid("json");
    const caption = await llmService.generateXiaohongshuCaption(
      prData,
      style as XiaohongshuStyle,
    );
    return c.json({ caption });
  },
);
