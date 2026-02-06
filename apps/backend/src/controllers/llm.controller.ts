import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PartnerRequestService } from "../services/PartnerRequestService";
import { LLMService, XiaohongshuStyle } from "../services/LLMService";
import type { PartnerRequestFields } from "../entities/partner-request";

const app = new Hono();
const llmService = new LLMService();
const prService = new PartnerRequestService();

const xiaohongshuCaptionRequestSchema = z.object({
  prId: z.coerce.number().int().positive(),
});

const xiaohongshuCaptionQuerySchema = z.object({
  style: z.string().optional(),
});

// POST /api/llm/xiaohongshu-caption - Generate Xiaohongshu caption
export const llmRoute = app.post(
  "/xiaohongshu-caption",
  zValidator("json", xiaohongshuCaptionRequestSchema),
  zValidator("query", xiaohongshuCaptionQuerySchema),
  async (c) => {
    const { prId } = c.req.valid("json");

    const pr = await prService.getPR(prId);
    const prFields: PartnerRequestFields = {
      title: pr.title ?? undefined,
      type: pr.type,
      time: pr.time,
      location: pr.location,
      expiresAt: pr.expiresAt ? pr.expiresAt.toISOString() : null,
      partners: pr.partners,
      budget: pr.budget,
      preferences: pr.preferences,
      notes: pr.notes,
    };

    const { style: styleRaw } = c.req.valid("query");

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

    const { caption, posterStylePrompt } =
      await llmService.generateXiaohongshuCaption(prFields, style);
    return c.json({ caption, posterStylePrompt });
  },
);
