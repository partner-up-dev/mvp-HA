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
  ): Promise<string> {
    const systemPrompt = await this.getXiaohongshuCaptionSystemPrompt();

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
}
