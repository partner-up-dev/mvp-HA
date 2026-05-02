import { z } from "zod";

export const prJoinGateSourceSchema = z.enum([
  "PR",
  "ANCHOR_EVENT",
  "PR_SUPPORT_RESOURCE",
]);
export type PRJoinGateSource = z.infer<typeof prJoinGateSourceSchema>;

const prJoinGateBaseSchema = z.object({
  key: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  source: prJoinGateSourceSchema,
});

export const prJoinNoticeGateConfigSchema = prJoinGateBaseSchema.extend({
  kind: z.literal("JOIN_NOTICE"),
  body: z.string().trim().min(1).max(5000),
});
export type PRJoinNoticeGateConfig = z.infer<
  typeof prJoinNoticeGateConfigSchema
>;

export const prBookingContactGateConfigSchema = prJoinGateBaseSchema.extend({
  kind: z.literal("BOOKING_CONTACT"),
  source: z.enum(["PR", "PR_SUPPORT_RESOURCE"]),
  prompt: z.string().trim().min(1).max(1000),
});
export type PRBookingContactGateConfig = z.infer<
  typeof prBookingContactGateConfigSchema
>;

export const prJoinGateConfigItemSchema = z.discriminatedUnion("kind", [
  prJoinNoticeGateConfigSchema,
  prBookingContactGateConfigSchema,
]);
export type PRJoinGateConfigItem = z.infer<
  typeof prJoinGateConfigItemSchema
>;

export const prJoinGateConfigSchema = z.array(prJoinGateConfigItemSchema);
export type PRJoinGateConfig = z.infer<typeof prJoinGateConfigSchema>;

export const normalizePRJoinGateConfig = (
  rawConfig: unknown,
): PRJoinGateConfig => {
  const parsed = prJoinGateConfigSchema.safeParse(rawConfig);
  if (parsed.success) {
    return parsed.data;
  }
  if (!Array.isArray(rawConfig)) {
    return [];
  }
  return rawConfig.flatMap((item) => {
    const parsedItem = prJoinGateConfigItemSchema.safeParse(item);
    return parsedItem.success ? [parsedItem.data] : [];
  });
};
