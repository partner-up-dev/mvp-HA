import { z } from "zod";

const optionalUrlFromEnv = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const optionalStringFromEnv = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalPositiveIntFromEnv = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const optionalBooleanStringFromEnv = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(["true", "false"]).optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().url(),

  // Configurable LLM settings (OpenAI v1 compatible)
  LLM_API_KEY: optionalStringFromEnv,
  LLM_BASE_URL: optionalUrlFromEnv,
  LLM_DEFAULT_MODEL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().default("gpt-4o-mini"),
  ),

  // Deprecated: Keep for backward compatibility
  OPENAI_API_KEY: optionalStringFromEnv,

  // DB operation timeout (ms) for config lookups (fallback is used on timeout)
  DB_OPERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(250),
  DB_CONNECT_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(5),

  // WeChat Official Account (for JS-SDK signature)
  WECHAT_OFFICIAL_ACCOUNT_APP_ID: optionalStringFromEnv,
  WECHAT_OFFICIAL_ACCOUNT_APP_SECRET: optionalStringFromEnv,
  WECHAT_AUTH_SESSION_SECRET: optionalStringFromEnv,
  // Unified WeChat ability mocking switch (OAuth + phone resolve) for non-production debugging.
  WECHAT_ABILITY_MOCKING_ENABLED: optionalBooleanStringFromEnv,
  WECHAT_ABILITY_MOCK_OPEN_ID: optionalStringFromEnv,
  WECHAT_REMINDER_TEMPLATE_ID: optionalStringFromEnv,
  WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID: optionalStringFromEnv,
  WECHAT_SUBMSG_ACTIVITY_START_REMINDER_TEMPLATE_ID: optionalStringFromEnv,
  WECHAT_SUBMSG_BOOKING_RESULT_TEMPLATE_ID: optionalStringFromEnv,
  WECHAT_SUBMSG_NEW_PARTNER_TEMPLATE_ID: optionalStringFromEnv,
  WECHAT_SUBMSG_PR_MESSAGE_TEMPLATE_ID: optionalStringFromEnv,
  FIXED_IP_HTTP_PROXY: optionalUrlFromEnv,

  // WeCom (Enterprise WeChat) self-built app
  WECOM_TOKEN: optionalStringFromEnv,
  WECOM_ENCODING_AES_KEY: optionalStringFromEnv,
  WECOM_CORP_ID: optionalStringFromEnv,
  WECOM_APP_AGENT_ID: optionalPositiveIntFromEnv,
  WECOM_APP_SECRET: optionalStringFromEnv,

  // Frontend URL for share links
  FRONTEND_URL: optionalStringFromEnv,
  // Optional exact OAuth callback URL registered in the WeChat official account console.
  WECHAT_OAUTH_CALLBACK_URL: optionalUrlFromEnv,

  // Access token (JWT-like HMAC token) config.
  AUTH_JWT_SECRET: z.string().min(16).default("dev-auth-secret-change-me"),
  AUTH_JWT_EXPIRES_SECONDS: z.coerce.number().int().positive().default(86_400),
  AUTH_JWT_RENEW_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(3_600),

  // Poster storage directory (used by upload controller)
  POSTERS_DIR: optionalStringFromEnv,
  AVATARS_DIR: optionalStringFromEnv,

  // Internal endpoint auth token for external job tick trigger.
  JOB_RUNNER_INTERNAL_TOKEN: optionalStringFromEnv,
  JOB_RUNNER_CLAIM_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  JOB_RUNNER_MAX_BATCHES_PER_TICK: z.coerce
    .number()
    .int()
    .positive()
    .default(3),
  JOB_RUNNER_TICK_BUDGET_MS: z.coerce.number().int().positive().default(3_000),
  JOB_RUNNER_LEASE_MS: z.coerce.number().int().positive().default(60_000),
  MAINTENANCE_TICK_BUDGET_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(25_000),

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

  // External maintenance outbox tick budget.
  OUTBOX_TICK_BATCH_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10_000),
  OUTBOX_TICK_MAX_BATCHES: z.coerce
    .number()
    .int()
    .positive()
    .default(50),

  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
