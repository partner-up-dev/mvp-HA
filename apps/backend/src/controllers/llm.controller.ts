import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { parsedPRSchema } from "../entities/partner-request";
import { LLMService, XiaohongshuStyle } from "../services/LLMService";

const app = new Hono();
const llmService = new LLMService();

// POST /api/llm/xiaohongshu-caption - Generate Xiaohongshu caption
export const llmRoute = app.post(
  "/xiaohongshu-caption",
  zValidator("json", parsedPRSchema),
  async (c) => {
    const prData = c.req.valid("json");

    const styleRaw = c.req.query("style");

    let style: number | XiaohongshuStyle | undefined = undefined;

    if (styleRaw !== undefined) {
      // Try parse as integer index first
      const asNumber = Number(styleRaw);
      if (
        !Number.isNaN(asNumber) &&
        Number.isInteger(asNumber) &&
        String(asNumber) === styleRaw
      ) {
        style = asNumber;
      } else {
        // Fall back to string enum if matches
        const s = String(styleRaw);
        if (
          ["friendly", "concise", "warm", "trendy", "professional"].includes(s)
        ) {
          style = s as XiaohongshuStyle;
        } else {
          return c.json({ error: "invalid style parameter" }, 400);
        }
      }
    }

    const caption = await llmService.generateXiaohongshuCaption(
      prData as any,
      style as any,
    );
    return c.json({ caption });
  },
);
