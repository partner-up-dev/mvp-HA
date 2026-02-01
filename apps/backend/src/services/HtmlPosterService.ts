import { generateObject } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { z } from "zod";
import { env } from "../lib/env";
import {
  POSTER_STYLE_PROMPTS,
  POSTER_STYLE_KEYS,
  PosterStyleKey,
} from "./PosterStylePrompts";

export type PosterRatio = "3:4" | "1:1" | "4:3";

export interface PosterGenerationRequest {
  caption: string;
  style: PosterStyleKey;
  ratio: PosterRatio;
  saveOnServer?: boolean;
  includeAiGraphics?: boolean;
}

export interface PosterDimensions {
  width: number;
  height: number;
}

export interface GeneratedPoster {
  html: string;
  dimensions: PosterDimensions;
}

interface ContentMetadata {
  type: "event" | "lifestyle" | "knowledge" | "emotional" | "business";
  length: number;
  sentiment: "positive" | "neutral" | "excited" | "calm";
  keywords: string[];
  hasTime: boolean;
  hasLocation: boolean;
  hasEmoji: boolean;
}

const DIMENSIONS_BY_RATIO: Record<PosterRatio, PosterDimensions> = {
  "3:4": { width: 1080, height: 1440 },
  "1:1": { width: 1080, height: 1080 },
  "4:3": { width: 1440, height: 1080 },
};

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

export class HtmlPosterService {
  private client: typeof openai;

  constructor() {
    if (env.LLM_BASE_URL) {
      this.client = createOpenAI({
        apiKey: env.LLM_API_KEY,
        baseURL: env.LLM_BASE_URL,
      });
    } else {
      this.client = openai;
    }
  }

  async generatePosterHtml(
    request: PosterGenerationRequest,
  ): Promise<GeneratedPoster> {
    const dimensions = DIMENSIONS_BY_RATIO[request.ratio];
    const metadata = analyzeContent(request.caption);
    const prompt = buildPosterPrompt(request, metadata, dimensions);

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: z.object({
        html: z.string().min(1),
      }),
      prompt,
      temperature: 0.6,
    });

    const html = ensureHtmlDocument(object.html, dimensions);

    return {
      html,
      dimensions,
    };
  }
}

const buildPosterPrompt = (
  request: PosterGenerationRequest,
  metadata: ContentMetadata,
  dimensions: PosterDimensions,
): string => {
  const stylePrompt = POSTER_STYLE_PROMPTS[request.style];
  const ratio = request.ratio;

  return `
${stylePrompt}

内容：
"${request.caption}"

内容分析：
- 类型：${metadata.type}
- 字数：${metadata.length}
- 情绪：${metadata.sentiment}
- 关键词：${metadata.keywords.join("、") || "无"}
- 是否包含时间：${metadata.hasTime ? "是" : "否"}
- 是否包含地点：${metadata.hasLocation ? "是" : "否"}
- 是否包含表情：${metadata.hasEmoji ? "是" : "否"}

画布尺寸：${dimensions.width}x${dimensions.height}px（比例 ${ratio}）

生成要求：
1. 输出完整 HTML 文档，包含 <style> 内联 CSS。
2. 只使用系统字体，不要引用外部图片、字体或网络资源。
3. 需要确保正文可读、层级清晰。
4. 适合小红书分享风格，支持中文排版。
5. 使用 CSS Grid 或 Flex，加入适度装饰元素。
6. 背景、阴影、渐变等效果可用，但保持性能友好。
7. 页面内容必须限制在指定尺寸内，不要出现滚动条。

输出：仅输出完整 HTML 文档。
`;
};

const analyzeContent = (caption: string): ContentMetadata => {
  const normalized = caption.trim();
  const length = normalized.length;
  const hasEmoji = EMOJI_REGEX.test(normalized);

  const hasTime =
    /(\d{1,2}[:：]\d{2})|今天|明天|后天|周末|星期|周[一二三四五六日天]/.test(
      normalized,
    );
  const hasLocation = /(在|到|去).{0,6}(附近|地铁|公园|广场|路|街)/.test(
    normalized,
  );

  const keywords =
    normalized.match(/[A-Za-z0-9\u4e00-\u9fff]{2,}/g)?.slice(0, 6) ?? [];

  const type = determineType(normalized);
  const sentiment = determineSentiment(normalized);

  return {
    type,
    length,
    sentiment,
    keywords,
    hasTime,
    hasLocation,
    hasEmoji,
  };
};

const determineType = (
  text: string,
): ContentMetadata["type"] => {
  if (/(学习|课程|讲座|培训|分享|读书)/.test(text)) return "knowledge";
  if (/(旅行|出游|露营|徒步|探店|打卡)/.test(text)) return "lifestyle";
  if (/(会议|项目|合作|创业|招募|行业)/.test(text)) return "business";
  if (/(聚会|约饭|吃饭|运动|健身|看展)/.test(text)) return "event";
  return "emotional";
};

const determineSentiment = (
  text: string,
): ContentMetadata["sentiment"] => {
  if (/[!！]/.test(text)) return "excited";
  if (/(温柔|治愈|陪伴|一起)/.test(text)) return "calm";
  if (/(开心|快乐|期待|喜欢)/.test(text)) return "positive";
  return "neutral";
};

const ensureHtmlDocument = (
  rawHtml: string,
  dimensions: PosterDimensions,
): string => {
  const trimmed = rawHtml.trim();
  const hasHtmlTag = /<html[\s>]/i.test(trimmed);
  const baseStyle = `
    html, body {
      margin: 0;
      padding: 0;
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
      overflow: hidden;
    }
    body {
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      background: #ffffff;
    }
  `;

  if (hasHtmlTag) {
    if (/<style[\s>]/i.test(trimmed)) {
      return trimmed.replace(
        /<style[\s>][\s\S]*?<\/style>/i,
        (match) => match.replace("</style>", `${baseStyle}\n</style>`),
      );
    }

    return trimmed.replace(
      /<head[\s>]/i,
      `<head><style>${baseStyle}</style>`,
    );
  }

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      ${baseStyle}
    </style>
  </head>
  <body>
    ${trimmed}
  </body>
</html>`;
};

export const resolvePosterStyle = (
  style?: number | PosterStyleKey,
): PosterStyleKey => {
  if (typeof style === "number") {
    const index = Number.isFinite(style) ? Math.floor(style) : 0;
    const normalized =
      ((index % POSTER_STYLE_KEYS.length) + POSTER_STYLE_KEYS.length) %
      POSTER_STYLE_KEYS.length;
    return POSTER_STYLE_KEYS[normalized];
  }

  if (style && POSTER_STYLE_KEYS.includes(style)) {
    return style;
  }

  return "fresh";
};
