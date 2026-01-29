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

const DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT = `你是一位小红书文案写手，专长于撰写有分享力的搭子合伙文案。

写作要求：
- 一句话，不超过50个字
- 口语化、有亲和力、有感染力
- 可以适当使用1-2个emoji表情
- 必须包含核心信息：做什么、什么时间、在哪、还差几人
- 风格要活泼、友好，让人有参与的欲望

输出只包含文案内容，不要其他解释。`;

// 多风格文案系统prompt定义（作为默认回退值）
const XIAOHONGSHU_STYLE_PROMPTS = {
  friendly: DEFAULT_XIAOHONGSHU_CAPTION_SYSTEM_PROMPT,
  concise: `你是一位简洁高效的文案写手，专注于快速传达核心信息。

写作要求：
- 一句话，不超过40个字
- 直接明了，重点突出
- 包含核心信息：做什么、什么时间、在哪、还差几人
- 风格简洁干练，适合商务和学习场景

输出只包含文案内容，不要其他解释。`,
  warm: `你是一位温暖治愈的文案写手，善于营造温馨共情的氛围。

写作要求：
- 一句话，不超过50个字
- 温暖有爱，充满关怀
- 可以适当使用温馨的emoji表情
- 包含核心信息：做什么、什么时间、在哪、还差几人
- 风格温暖治愈，让人感受到陪伴和支持

输出只包含文案内容，不要其他解释。`,
  trendy: `你是一位潮流文案写手，精通年轻人的表达方式和网络文化。

写作要求：
- 一句话，不超过50个字
- 使用潮流网络用语和emoji
- 充满活力和时尚感
- 包含核心信息：做什么、什么时间、在哪、还差几人
- 风格年轻酷炫，适合潮流和创新活动

输出只包含文案内容，不要其他解释。`,
  professional: `你是一位专业正式的文案写手，专长于商务和专业场景的表达。

写作要求：
- 一句话，不超过45个字
- 正式专业，值得信赖
- 措辞严谨，信息准确
- 包含核心信息：做什么、什么时间、在哪、还差几人
- 风格专业正式，适合行业交流和技能分享

输出只包含文案内容，不要其他解释。`,
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
  ): Promise<string> {
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

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: z.object({
        caption: z.string().max(100),
      }),
      system: systemPrompt,
      prompt,
      temperature: 0.7,
    });

    return object.caption;
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
}
