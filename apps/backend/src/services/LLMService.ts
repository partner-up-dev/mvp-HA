import { generateObject } from 'ai';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { parsedPRSchema, type ParsedPartnerRequest } from '../entities/partner-request';
import { env } from '../lib/env';
import { ConfigService } from './ConfigService';

const CONFIG_KEY_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT = 'partner_request.parse_system_prompt';

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

  private async getParsePartnerRequestSystemPrompt(): Promise<string> {
    return await this.configService.getValueOrFallback(
      CONFIG_KEY_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT,
      DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT,
    );
  }
}
