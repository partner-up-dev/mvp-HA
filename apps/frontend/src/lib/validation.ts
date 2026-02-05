import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

// Validation schema matching backend requirements
export const createPRSchema = z.object({
  rawText: z
    .string()
    .min(1, "请输入搭子需求描述")
    .max(2000, "描述不能超过2000字符")
    .transform((val) => val.trim()),

  pin: z.string().regex(/^\d{4}$/, "PIN码必须是4位数字"),
});

export type CreatePRInput = z.infer<typeof createPRSchema>;

// Convert to VeeValidate schema
export const createPRValidationSchema = toTypedSchema(createPRSchema);

// Parsed fields validation schema
export const parsedFieldsSchema = z.object({
  title: z.string().optional(),
  scenario: z.string().min(1, "请输入活动类型"),
  time: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  minParticipants: z.number().nullable(),
  maxParticipants: z.number().nullable(),
  budget: z.string().nullable(),
  preferences: z.array(z.string()),
  notes: z.string().nullable(),
});

// Update content schema
export const updateContentSchema = z.object({
  parsed: parsedFieldsSchema,
  pin: z.string().regex(/^\d{4}$/, "PIN码必须是4位数字"),
});

export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export const updateContentValidationSchema = toTypedSchema(updateContentSchema);
