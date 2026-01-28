import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { parsedPRSchema } from "../entities/partner-request";
import { LLMService } from "../services/LLMService";

const app = new Hono();
const llmService = new LLMService();

// POST /api/llm/xiaohongshu-caption - Generate Xiaohongshu caption
const generateCaptionSchema = parsedPRSchema;

export const llmRoute = app.post(
  "/xiaohongshu-caption",
  zValidator("json", generateCaptionSchema),
  async (c) => {
    const prData = c.req.valid("json");
    const caption = await llmService.generateXiaohongshuCaption(prData);
    return c.json({ caption });
  },
);
