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

  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
