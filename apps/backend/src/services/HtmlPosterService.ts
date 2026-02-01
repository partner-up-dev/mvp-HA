import { generateObject } from "ai";
import { z } from "zod";
import {
  type PosterDimensions,
  type PosterRatio,
  type PosterStyle,
  getPosterDimensions,
} from "../lib/poster";
import { env } from "../lib/env";
import { POSTER_STYLE_PROMPTS } from "./PosterStylePrompts";
import { createLlmClient } from "./llm-client";

export interface HtmlPosterRequest {
  caption: string;
  style: PosterStyle;
  ratio: PosterRatio;
  includeAiGraphics?: boolean;
}

export interface GeneratedPoster {
  html: string;
  dimensions: PosterDimensions;
}

interface ContentAnalysis {
  length: number;
  sentiment: "positive" | "neutral" | "excited" | "calm";
  hasEmoji: boolean;
  keywords: string[];
}

const htmlSchema = z.object({
  html: z.string().min(1),
});

const emojiRegex = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u;

const analyzeCaption = (caption: string): ContentAnalysis => {
  const trimmed = caption.trim();
  const length = trimmed.length;
  const hasEmoji = emojiRegex.test(trimmed);
  const keywords = trimmed
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .map((value) => value.trim())
    .filter((value) => value.length > 1)
    .slice(0, 6);

  const sentiment: ContentAnalysis["sentiment"] =
    /[!！]/.test(trimmed) || /🎉|🔥|✨|💥/.test(trimmed)
      ? "excited"
      : length <= 14
        ? "positive"
        : "calm";

  return {
    length,
    sentiment,
    hasEmoji,
    keywords,
  };
};

const buildPosterPrompt = (
  caption: string,
  style: PosterStyle,
  ratio: PosterRatio,
  dimensions: PosterDimensions,
  analysis: ContentAnalysis,
  includeAiGraphics?: boolean,
): string => `
You are designing a single-page HTML poster for Xiaohongshu sharing.

STYLE DIRECTION:
${POSTER_STYLE_PROMPTS[style]}

CAPTION:
"${caption}"

CONTENT ANALYSIS:
- length: ${analysis.length}
- sentiment: ${analysis.sentiment}
- hasEmoji: ${analysis.hasEmoji}
- keywords: ${analysis.keywords.join(", ") || "none"}

RENDERING REQUIREMENTS:
- Output a complete HTML document with a <style> tag.
- Use only system fonts (no external assets).
- Poster size: ${dimensions.width}x${dimensions.height}px (${ratio}).
- Ensure the poster fills the full canvas, with no margins.
- Use CSS Grid or Flexbox for layout.
- Keep text readable for Chinese characters.
- Use decorative elements built with CSS only (no external images).
- ${includeAiGraphics ? "You may use lightweight CSS graphics." : "Avoid heavy graphics; focus on typography."}

OUTPUT:
- Return JSON with a single key: "html".
`;

const normalizeHtmlDocument = (
  rawHtml: string,
  dimensions: PosterDimensions,
): string => {
  const withoutScripts = rawHtml.replace(
    /<script[\s\S]*?<\/script>/gi,
    "",
  );
  const trimmed = withoutScripts.trim();
  const baseStyles = `
* { box-sizing: border-box; }
html, body { width: ${dimensions.width}px; height: ${dimensions.height}px; margin: 0; padding: 0; }
body { display: flex; }
`.trim();

  if (!/<html/i.test(trimmed)) {
    return `<!doctype html><html><head><meta charset="utf-8" /><style>${baseStyles}</style></head><body>${trimmed}</body></html>`;
  }

  const withDoctype = /<!doctype/i.test(trimmed)
    ? trimmed
    : `<!doctype html>${trimmed}`;

  if (/<style[\s>]/i.test(withDoctype)) {
    return withDoctype.replace(
      /<style[^>]*>/i,
      (match) => `${match}\n${baseStyles}\n`,
    );
  }

  if (/<head[\s>]/i.test(withDoctype)) {
    return withDoctype.replace(
      /<head[^>]*>/i,
      (match) => `${match}<style>${baseStyles}</style>`,
    );
  }

  return withDoctype.replace(
    /<html[^>]*>/i,
    (match) =>
      `${match}<head><meta charset="utf-8" /><style>${baseStyles}</style></head>`,
  );
};

const buildFallbackHtml = (
  caption: string,
  style: PosterStyle,
  dimensions: PosterDimensions,
): string => {
  const fallbackStyles = `
* { box-sizing: border-box; }
html, body { width: ${dimensions.width}px; height: ${dimensions.height}px; margin: 0; padding: 0; }
body { display: flex; align-items: center; justify-content: center; background: #ffffff; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }
.poster { width: 90%; height: 90%; padding: 60px; border-radius: 32px; border: 2px solid #e5e7eb; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
.label { font-size: 28px; text-transform: uppercase; letter-spacing: 0.12em; color: #9ca3af; }
.caption { font-size: 54px; line-height: 1.3; font-weight: 600; }
.footer { font-size: 24px; color: #6b7280; }
`.trim();

  const styleLabel = style.toUpperCase();
  return `<!doctype html><html><head><meta charset="utf-8" /><style>${fallbackStyles}</style></head><body><div class="poster"><div class="label">${styleLabel} POSTER</div><div class="caption">${caption}</div><div class="footer">PartnerUp · Xiaohongshu</div></div></body></html>`;
};

export class HtmlPosterService {
  private client = createLlmClient();

  async generatePosterHtml(request: HtmlPosterRequest): Promise<GeneratedPoster> {
    const dimensions = getPosterDimensions(request.ratio);
    const analysis = analyzeCaption(request.caption);
    const prompt = buildPosterPrompt(
      request.caption,
      request.style,
      request.ratio,
      dimensions,
      analysis,
      request.includeAiGraphics,
    );

    try {
      const { object } = await generateObject({
        model: this.client(env.LLM_DEFAULT_MODEL),
        schema: htmlSchema,
        prompt,
        temperature: 0.7,
      });

      const normalized = normalizeHtmlDocument(object.html, dimensions);

      return {
        html: normalized,
        dimensions,
      };
    } catch (error) {
      console.error("LLM poster generation failed, using fallback:", error);
      return {
        html: buildFallbackHtml(request.caption, request.style, dimensions),
        dimensions,
      };
    }
  }
}
