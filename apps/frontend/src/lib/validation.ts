import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import { i18n } from "@/locales/i18n";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime();
const isoDateOrDateTimeSchema = z.union([isoDateTimeSchema, isoDateSchema]);

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, i18n.global.t("validation.pinMustBeFourDigits"));

const fieldsSchema: z.ZodType<PartnerRequestFields> = z.object({
  title: z.string().optional(),
  type: z.string().min(1, i18n.global.t("validation.typeRequired")),
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

export const createNaturalLanguagePRSchema = z
  .object({
    rawText: z
      .string()
      .min(1, i18n.global.t("validation.naturalLanguageRequired"))
      .max(2000),
    pin: pinSchema,
  })
  .refine(
    ({ rawText }) => rawText.trim().split(/\s+/).filter(Boolean).length <= 50,
    { message: i18n.global.t("validation.naturalLanguageWordLimit") },
  );

export const createNaturalLanguagePRValidationSchema = toTypedSchema(
  createNaturalLanguagePRSchema,
);

export const partnerRequestFormSchema = z.object({
  fields: fieldsSchema,
  pin: pinSchema,
});

export const partnerRequestFormValidationSchema = toTypedSchema(
  partnerRequestFormSchema,
);

export type CreateNaturalLanguagePRInput = z.infer<
  typeof createNaturalLanguagePRSchema
>;
export type PartnerRequestFormInput = z.infer<typeof partnerRequestFormSchema>;
