import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

// Validation schema matching backend requirements
export const createPRSchema = z.object({
  rawText: z
    .string()
    .min(1, "è¯·è¾“å…¥æ­å­éœ€æ±‚æè¿°")
    .max(2000, "æè¿°ä¸èƒ½è¶…è¿‡2000å­—ç¬¦")
    .transform((val) => val.trim()),

  pin: z.string().regex(/^\d{4}$/, "PINç å¿…é¡»æ˜¯4ä½æ•°å­—"),
});

export type CreatePRInput = z.infer<typeof createPRSchema>;

// Convert to VeeValidate schema
export const createPRValidationSchema = toTypedSchema(createPRSchema);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime();
const isoDateOrDateTimeSchema = z.union([isoDateTimeSchema, isoDateSchema]);

// Partner request fields validation schema
export const prFieldsSchema = z.object({
  title: z.string().optional(),
  type: z.string().min(1, "è¯·è¾“å…¥æ´»åŠ¨ç±»åž‹"),
  time: z.tuple([
    isoDateOrDateTimeSchema.nullable(),
    isoDateOrDateTimeSchema.nullable(),
  ]),
  location: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  partners: z.tuple([
    z.number().nullable(),
    z.number().int().nonnegative(),
    z.number().nullable(),
  ]),
  budget: z.string().nullable(),
  preferences: z.array(z.string()),
  notes: z.string().nullable(),
});

// Update content schema
export const updateContentSchema = z.object({
  fields: prFieldsSchema,
  pin: z.string().regex(/^\d{4}$/, "PINç å¿…é¡»æ˜¯4ä½æ•°å­—"),
});

export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export const updateContentValidationSchema = toTypedSchema(updateContentSchema);
