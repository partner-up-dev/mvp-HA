import { generateObject } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import {
  parsedPRSchema,
  type ParsedPartnerRequest,
} from "../entities/partner-request";
import { env } from "../lib/env";
import { ConfigService } from "./ConfigService";
import { z } from "zod";

const CONFIG_KEY_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT =
  "partner_request.parse_system_prompt";
const CONFIG_KEY_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT =
  "xiaohongshu.caption_system_prompt";
const CONFIG_KEY_XIAOHONGSHU_STYLE_PROMPT = "xiaohongshu_style_prompt";

const CONFIG_KEY_SHARE_XIAOHONGSHU_POSTER_HTML_STYLE_PROMPTS =
  "share.xiaohongshu_poster_html_style_prompts";
const CONFIG_KEY_SHARE_WECHAT_CARD_THUMBNAIL_HTML_STYLE_PROMPTS =
  "share.wechat_card_thumbnail_html_style_prompts";

export type PosterHtmlResponse = {
  html: string;
  width: number;
  height: number;
  backgroundColor?: string;
  meta?: {
    keyText?: string;
  };
};

const DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT = `你是一个搭子需求解析助手。用户会输入自然语言描述的搭子需求，你需要将其结构化。

解析规则：
- title: 需求标题，简洁概括需求内容（8-18字），例如："周末一起爬香山"、"找人一起学习日语"、"寻通勤拼车伙伴"
- scenario: 场景类型，如：旅行/通勤/用餐/运动/学习/娱乐等
- time: 时间要求，如果没有明确说明则为null
- location: 地点要求，如果没有明确说明则为null
- minParticipants: 最少需要的参与人数，数字类型，如果没有明确说明则为null
- maxParticipants: 最多需要的参与人数，数字类型，如果没有明确说明则为null（注意：如果用户只说"需要2人"，则minParticipants和maxParticipants都是2）
- budget: 预算范围，如果没有明确说明则为null
- preferences: 其他偏好要求，字符串数组
- notes: 其他备注信息，如果没有则为null`;

const DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT = `你是一位小红书文案写手和视觉设计师，专长于撰写有分享力的搭子合伙文案，并设计与之匹配的海报风格。

写作要求：
- caption: 一句话，不超过16个字，口语化、有亲和力、有感染力，可以适当使用1-2个emoji表情，必须包含核心信息：做什么、什么时间、在哪、还差几人，风格要活泼、友好，让人有参与的欲望
- posterStylePrompt: 与caption语义对齐的海报设计提示词，用于生成小红书海报HTML，要求简洁、可信、非营销，强调文字易读性和几何图形装饰。禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`;

const DEFAULT_SHARE_XHS_POSTER_HTML_STYLE_PROMPTS: readonly string[] = [
  `你是一位中文信息海报设计师。

目标：为小红书生成一张“干净、可信、非营销”的搭子需求海报 HTML。

硬性要求：
- 海报比例 2:3，尺寸必须为 720x1080。
- 文字必须非常大、易读。
- 只允许：文字 + 简单几何图形（圆角矩形/圆/线条）。
- 禁止任何营销/广告语、夸张情绪化词汇。

HTML/CSS 约束：
- 输出必须是一个完整 HTML 文档字符串。
- 只允许内联 CSS（<style> 可用）。
- 禁止 <script>、事件处理器、外链资源（无图片/无外链字体/无外链CSS）。
- 必须包含且仅包含一个根节点：<div id="poster-root">...</div>，并且根节点固定宽高。
`,
  `你是一位极简信息视觉设计师。

目标：输出可信赖、用户自述式的小红书搭子海报 HTML（不是广告）。

硬性要求：
- 尺寸 720x1080（2:3）。
- 以大标题/大段文本为主，留白充足。
- 只使用系统字体，颜色克制。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root 根节点）。
`,
  `你是一位信息可视化排版师。

目标：把给定文案排版成小红书海报 HTML，强调可读性与可信感。

硬性要求：
- 尺寸 720x1080。
- 文案必须是视觉中心，字号必须大。
- 允许少量几何装饰（线/点/圆角块），不要复杂效果。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root 根节点）。
`,
];

const DEFAULT_SHARE_WECHAT_THUMBNAIL_HTML_STYLE_PROMPTS: readonly string[] = [
  `你是一位微信分享卡片缩略图设计师。

目标：生成一张“简洁、可信、非营销”的 1:1 缩略图 HTML。

硬性要求：
- 尺寸必须为 300x300。
- 画面只包含：简单几何图形 + (≤3 个字符) 或 (1 个 emoji)。
- 字符/emoji 必须来自上下文（标题/场景/地点等），不要编造。

HTML/CSS 约束：
- 输出完整 HTML 文档。
- 只允许内联 CSS（<style> 可用），禁止脚本与外链资源。
- 必须包含根节点 <div id="poster-root">...</div> 并固定宽高。
`,
  `你是一位极简 UI 设计师。

目标：输出微信分享缩略图 HTML（300x300），避免广告感。

硬性要求：
- 只呈现 1 个 emoji 或 ≤3 个汉字。
- 可配合少量几何背景。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root）。
`,
  `你是一位品牌中性的信息图设计师。

目标：生成微信分享卡片缩略图 HTML，风格克制可信。

硬性要求：
- 300x300。
- 只含简单图形 + ≤3 字或 1 emoji。

HTML/CSS 约束：同上（无脚本、无外链、单一 #poster-root）。
`,
];

const DEFAULT_POSTER_STYLE_PROMPT =
  DEFAULT_SHARE_XHS_POSTER_HTML_STYLE_PROMPTS[0];

const xhsPosterHtmlResponseSchema = z.object({
  html: z.string().min(1),
  width: z.literal(720),
  height: z.literal(1080),
  backgroundColor: z.string().optional(),
});

const wechatThumbnailHtmlResponseSchema = z.object({
  html: z.string().min(1),
  width: z.literal(300),
  height: z.literal(300),
  backgroundColor: z.string().optional(),
  meta: z
    .object({
      keyText: z.string().min(1).max(4),
    })
    .optional(),
});

// 多风格文案系统prompt定义（作为默认回退值）
const XIAOHONGSHU_STYLE_PROMPTS = {
  friendly: DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT,
  concise: `你是一位简洁高效的文案写手和视觉设计师，专注于快速传达核心信息并设计匹配的海报风格。

写作要求：
- caption: 一句话，不超过16个字，直接明了，重点突出，包含核心信息：做什么、什么时间、在哪、还差几人，风格简洁干练，适合商务和学习场景
- posterStylePrompt: 与caption语义对齐的海报设计提示词，强调简洁布局和大字体，适合商务和学习场景。只允许文字和简单几何图形，禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`,
  warm: `你是一位温暖治愈的文案写手和视觉设计师，善于营造温馨共情的氛围并设计温暖的海报风格。

写作要求：
- caption: 一句话，不超过16个字，温暖有爱，充满关怀，可以适当使用温馨的emoji表情，包含核心信息：做什么、什么时间、在哪、还差几人，风格温暖治愈，让人感受到陪伴和支持
- posterStylePrompt: 与caption语义对齐的海报设计提示词，使用温暖色调和柔和几何图形，营造治愈氛围。只允许文字和简单几何图形，禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`,
  trendy: `你是一位潮流文案写手和视觉设计师，精通年轻人的表达方式和网络文化，设计时尚的海报风格。

写作要求：
- caption: 一句话，不超过16个字，使用潮流网络用语和emoji，充满活力和时尚感，包含核心信息：做什么、什么时间、在哪、还差几人，风格年轻酷炫，适合潮流和创新活动
- posterStylePrompt: 与caption语义对齐的海报设计提示词，使用现代几何图形和活力色彩，体现潮流感。只允许文字和简单几何图形，禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`,
  professional: `你是一位专业正式的文案写手和视觉设计师，专长于商务和专业场景的表达，设计专业海报风格。

写作要求：
- caption: 一句话，不超过15个字，正式专业，值得信赖，措辞严谨，信息准确，包含核心信息：做什么、什么时间、在哪、还差几人，风格专业正式，适合行业交流和技能分享
- posterStylePrompt: 与caption语义对齐的海报设计提示词，使用克制配色和专业布局，强调可信度和正式感。只允许文字和简单几何图形，禁止任何图片、外链资源或脚本。

输出只包含JSON格式的caption和posterStylePrompt字段，不要其他解释。`,
} as const;

export type XiaohongshuStyle = keyof typeof XIAOHONGSHU_STYLE_PROMPTS;

export class LLMService {
  private client: typeof openai;
  private configService: ConfigService;

  constructor() {
    if (env.LLM_BASE_URL) {
      this.client = createOpenAI({
        apiKey: env.LLM_API_KEY,
        baseURL: env.LLM_BASE_URL,
      });
    } else {
      this.client = openai;
    }

    this.configService = new ConfigService();
  }

  async parseRequest(rawText: string): Promise<ParsedPartnerRequest> {
    const systemPrompt = await this.getParsePartnerRequestSystemPrompt();

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: parsedPRSchema,
      system: systemPrompt,
      prompt: rawText,
      temperature: 0.3,
    });

    return object;
  }

  async generateXiaohongshuCaption(
    prData: ParsedPartnerRequest,
    style?: number | XiaohongshuStyle,
  ): Promise<{ caption: string; posterStylePrompt: string }> {
    const styles = await this.getXiaohongshuStylePrompts();

    let systemPrompt: string;

    if (typeof style === "number") {
      if (styles.length === 0) {
        systemPrompt = DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT;
      } else {
        const idx = Math.floor(style);
        const n = styles.length;
        const selected = ((idx % n) + n) % n; // wraparound, handle negative
        systemPrompt = styles[selected];
      }
    } else if (typeof style === "string" && XIAOHONGSHU_STYLE_PROMPTS[style]) {
      systemPrompt = XIAOHONGSHU_STYLE_PROMPTS[style];
    } else {
      // no style specified or unknown string style -> random
      systemPrompt =
        styles.length > 0
          ? styles[Math.floor(Math.random() * styles.length)]
          : DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT;
    }

    const prompt = this.buildXiaohongshuCaptionPrompt(prData);

    try {
      const { object } = await generateObject({
        model: this.client(env.LLM_DEFAULT_MODEL),
        schema: z.object({
          caption: z.string().max(100),
          posterStylePrompt: z.string(),
        }),
        system: systemPrompt,
        prompt,
        temperature: 0.7,
      });

      return {
        caption: object.caption,
        posterStylePrompt:
          object.posterStylePrompt || DEFAULT_POSTER_STYLE_PROMPT,
      };
    } catch (error) {
      // Fallback: generate caption only and use default posterStylePrompt
      const { object } = await generateObject({
        model: this.client(env.LLM_DEFAULT_MODEL),
        schema: z.object({
          caption: z.string().max(100),
        }),
        system: systemPrompt
          .replace(/posterStylePrompt.*?\n/g, "")
          .replace(
            /输出只包含JSON格式的caption和posterStylePrompt字段/g,
            "输出只包含文案内容，不要其他解释。",
          ),
        prompt,
        temperature: 0.7,
      });

      return {
        caption: object.caption,
        posterStylePrompt: DEFAULT_POSTER_STYLE_PROMPT,
      };
    }
  }

  async generateXiaohongshuPosterHtml(params: {
    pr: { parsed: ParsedPartnerRequest; rawText: string };
    caption: string;
    posterStylePrompt: string;
  }): Promise<PosterHtmlResponse> {
    const baseConstraints = `你是一位中文信息海报设计师。

目标：为小红书生成一张"干净、可信、非营销"的搭子需求海报 HTML。

硬性要求：
- 海报比例 2:3，尺寸必须为 720x1080。
- 文字必须非常大、易读。
- 只允许：文字 + 简单几何图形（圆角矩形/圆/线条）。
- 禁止任何营销/广告语、夸张情绪化词汇。

HTML/CSS 约束：
- 输出必须是一个完整 HTML 文档字符串。
- 只允许内联 CSS（<style> 可用）。
- 禁止 <script>、事件处理器、外链资源（无图片/无外链字体/无外链CSS）。
- 必须包含且仅包含一个根节点：<div id="poster-root">...</div>，并且根节点固定宽高。`;

    const system = `${baseConstraints}\n\n设计风格：${params.posterStylePrompt}`;

    const prompt = this.buildXhsPosterHtmlPrompt(params.pr, params.caption);

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: xhsPosterHtmlResponseSchema,
      system,
      prompt,
      temperature: 0.4,
    });

    return object;
  }

  async generateWeChatCardThumbnailHtml(params: {
    pr: { parsed: ParsedPartnerRequest; rawText: string };
    style?: number;
  }): Promise<PosterHtmlResponse> {
    const stylePrompts = await this.getShareWeChatThumbnailHtmlStylePrompts();
    const system = this.pickPromptByIndex(stylePrompts, params.style);

    const prompt = this.buildWeChatThumbnailHtmlPrompt(params.pr);

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: wechatThumbnailHtmlResponseSchema,
      system,
      prompt,
      temperature: 0.3,
    });

    return object;
  }

  private buildXiaohongshuCaptionPrompt(prData: ParsedPartnerRequest): string {
    const parts: string[] = [];

    if (prData.title) parts.push(`活动标题：${prData.title}`);
    if (prData.time) parts.push(`时间：${prData.time}`);
    if (prData.location) parts.push(`地点：${prData.location}`);
    if (prData.maxParticipants && prData.minParticipants) {
      const needed = prData.maxParticipants - prData.minParticipants;
      parts.push(
        `需要人数：还差${needed > 0 ? needed : prData.maxParticipants}人`,
      );
    }
    if (prData.preferences && prData.preferences.length > 0) {
      parts.push(`偏好：${prData.preferences.join("、")}`);
    }
    if (prData.notes) parts.push(`其他说明：${prData.notes}`);

    return parts.join("\n");
  }

  private async getParsePartnerRequestSystemPrompt(): Promise<string> {
    return await this.configService.getValueOrFallback(
      CONFIG_KEY_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT,
      DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT,
    );
  }

  private async getXiaohongshuCaptionSystemPrompt(): Promise<string> {
    return await this.configService.getValueOrFallback(
      CONFIG_KEY_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT,
      DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT,
    );
  }

  private async getXiaohongshuStylePrompts(): Promise<string[]> {
    const fallback = Object.values(XIAOHONGSHU_STYLE_PROMPTS) as string[];
    return await this.configService.getJsonArrayOrFallback(
      CONFIG_KEY_XIAOHONGSHU_STYLE_PROMPT,
      fallback,
    );
  }

  private getRandomStyle(): XiaohongshuStyle {
    const styles = Object.keys(XIAOHONGSHU_STYLE_PROMPTS) as XiaohongshuStyle[];
    const randomIndex = Math.floor(Math.random() * styles.length);
    return styles[randomIndex];
  }

  private pickPromptByIndex(prompts: string[], style?: number): string {
    if (prompts.length === 0) return "";

    if (typeof style === "number" && Number.isFinite(style)) {
      const idx = Math.floor(style);
      const n = prompts.length;
      const selected = ((idx % n) + n) % n;
      return prompts[selected];
    }

    return prompts[0];
  }

  private async getShareXhsPosterHtmlStylePrompts(): Promise<string[]> {
    return await this.configService.getJsonArrayOrFallback(
      CONFIG_KEY_SHARE_XIAOHONGSHU_POSTER_HTML_STYLE_PROMPTS,
      [...DEFAULT_SHARE_XHS_POSTER_HTML_STYLE_PROMPTS],
    );
  }

  private async getShareWeChatThumbnailHtmlStylePrompts(): Promise<string[]> {
    return await this.configService.getJsonArrayOrFallback(
      CONFIG_KEY_SHARE_WECHAT_CARD_THUMBNAIL_HTML_STYLE_PROMPTS,
      [...DEFAULT_SHARE_WECHAT_THUMBNAIL_HTML_STYLE_PROMPTS],
    );
  }

  private buildXhsPosterHtmlPrompt(
    pr: { parsed: ParsedPartnerRequest; rawText: string },
    caption: string,
  ): string {
    const parts: string[] = [];
    parts.push(`海报文案（必须原样出现）：${caption}`);

    const title = pr.parsed.title?.trim();
    if (title) parts.push(`标题：${title}`);
    parts.push(`场景：${pr.parsed.scenario}`);
    if (pr.parsed.time) parts.push(`时间：${pr.parsed.time}`);
    if (pr.parsed.location) parts.push(`地点：${pr.parsed.location}`);
    if (pr.parsed.minParticipants !== null)
      parts.push(`最少人数：${pr.parsed.minParticipants}`);
    if (pr.parsed.maxParticipants !== null)
      parts.push(`最多人数：${pr.parsed.maxParticipants}`);

    parts.push(
      "\n输出要求：请输出 JSON，字段为 html,width,height,backgroundColor。不要输出解释。",
    );
    parts.push(
      "HTML 要求：在 #poster-root 内布局，文本字号要非常大（建议 >= 56px），留白充足。",
    );
    return parts.join("\n");
  }

  private buildWeChatThumbnailHtmlPrompt(pr: {
    parsed: ParsedPartnerRequest;
    rawText: string;
  }): string {
    const parts: string[] = [];
    const title = pr.parsed.title?.trim();
    if (title) parts.push(`标题：${title}`);
    parts.push(`场景：${pr.parsed.scenario}`);
    if (pr.parsed.location) parts.push(`地点：${pr.parsed.location}`);

    parts.push(
      "从以上信息中选择一个 keyText：要么是 1 个 emoji，要么是 <=3 个汉字。",
    );
    parts.push(
      "输出要求：请输出 JSON，字段为 html,width,height,backgroundColor,meta。meta.keyText 建议给出。不要输出解释。",
    );
    parts.push(
      "视觉要求：极简、可信、无广告感；背景可用简单几何形状；keyText 居中且很大。",
    );

    return parts.join("\n");
  }
}
