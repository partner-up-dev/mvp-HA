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
  WECHAT_REMINDER_TEMPLATE_ID: z.string().min(1).optional(),
  WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID: z.string().min(1).optional(),
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

  // Internal endpoint auth token for external job tick trigger.
  JOB_RUNNER_INTERNAL_TOKEN: z.string().min(1).optional(),
  JOB_RUNNER_CLAIM_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  JOB_RUNNER_MAX_BATCHES_PER_TICK: z.coerce
    .number()
    .int()
    .positive()
    .default(3),
  JOB_RUNNER_TICK_BUDGET_MS: z.coerce.number().int().positive().default(3_000),
  JOB_RUNNER_LEASE_MS: z.coerce.number().int().positive().default(60_000),

  // Request-tail best-effort job tick (compensates coarse external scheduler).
  REQUEST_TAIL_JOB_TICK_BUDGET_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(80),
  REQUEST_TAIL_JOB_TICK_MAX_BATCHES: z.coerce
    .number()
    .int()
    .positive()
    .default(1),
  REQUEST_TAIL_JOB_TICK_MIN_INTERVAL_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(30_000),

  // Request-tail outbox drain budget.
  OUTBOX_REQUEST_DRAIN_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(80),
  OUTBOX_REQUEST_DRAIN_MAX_BATCHES: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
