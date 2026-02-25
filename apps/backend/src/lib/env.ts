import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),

  // Configurable LLM settings (OpenAI v1 compatible)
  LLM_API_KEY: z.string().min(1).optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_DEFAULT_MODEL: z.string().default("gpt-4o-mini"),

  // Deprecated: Keep for backward compatibility
  OPENAI_API_KEY: z.string().min(1).optional(),

  // DB operation timeout (ms) for config lookups (fallback is used on timeout)
  DB_OPERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(250),

  // WeChat Official Account (for JS-SDK signature)
  WECHAT_OFFICIAL_ACCOUNT_APP_ID: z.string().min(1).optional(),
  WECHAT_OFFICIAL_ACCOUNT_APP_SECRET: z.string().min(1).optional(),
  WECHAT_AUTH_SESSION_SECRET: z.string().min(1).optional(),
  FIXED_IP_HTTP_PROXY: z.string().url().optional(),

  // WeCom (Enterprise WeChat) self-built app
  WECOM_TOKEN: z.string().min(1).optional(),
  WECOM_ENCODING_AES_KEY: z.string().min(1).optional(),
  WECOM_CORP_ID: z.string().min(1).optional(),
  WECOM_APP_AGENT_ID: z.coerce.number().int().positive().optional(),
  WECOM_APP_SECRET: z.string().min(1).optional(),

  // Frontend URL for share links
  FRONTEND_URL: z.string().min(1).optional(),

  // Poster storage directory (used by upload controller)
  POSTERS_DIR: z.string().min(1).optional(),

  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
