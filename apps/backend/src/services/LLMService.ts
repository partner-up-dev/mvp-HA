import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  parsedPRSchema,
  type ParsedPartnerRequest,
} from "../entities/partner-request";

export class LLMService {
  static parsePRPrompt = `你是一个搭子需求解析助手。用户会输入自然语言描述的搭子需求，你需要将其结构化。

  解析规则：
  - scenario: 场景类型，如：旅行/通勤/用餐/运动/学习/娱乐等
  - time: 时间要求，如果没有明确说明则为null
  - location: 地点要求，如果没有明确说明则为null
  - peopleCount: 需要的人数，数字类型，如果没有明确说明则为null
  - budget: 预算范围，如果没有明确说明则为null
  - preferences: 其他偏好要求，字符串数组
  - notes: 其他备注信息，如果没有则为null`;

  async parseRequest(rawText: string): Promise<ParsedPartnerRequest> {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: parsedPRSchema,
      system: LLMService.parsePRPrompt,
      prompt: rawText,
      temperature: 0.3,
    });

    return object;
  }
}
