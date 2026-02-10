import { generateObject } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import {
  partnerRequestFieldsSchema,
  type PartnerRequestFields,
} from "../entities/partner-request";
import { env } from "../lib/env";
import { ConfigService } from "./ConfigService";
import { DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT } from "./prompts/partnerRequestParsePrompt";

const CONFIG_KEY_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT =
  "partner_request.parse_system_prompt";

export class PartnerRequestAIService {
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

  async parseRequest(
    rawText: string,
    nowIso: string,
  ): Promise<PartnerRequestFields> {
    const systemPrompt = await this.configService.getValueOrFallback(
      CONFIG_KEY_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT,
      DEFAULT_PARTNER_REQUEST_PARSE_SYSTEM_PROMPT,
    );

    const prompt = [
      "Parse the user request and output structured PartnerRequest fields.",
      "",
      `Current time (ISO 8601): ${nowIso}`,
      "",
      "User input:",
      rawText,
    ].join("\n");

    const { object } = await generateObject({
      model: this.client(env.LLM_DEFAULT_MODEL),
      schema: partnerRequestFieldsSchema,
      system: `${systemPrompt}\n\nCurrent time (ISO 8601): ${nowIso}`,
      prompt,
      temperature: 0.3,
    });

    return object;
  }
}
