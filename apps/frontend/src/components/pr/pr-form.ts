import type { PRFormFields } from "@/entities/pr/types";

export const clonePRFields = (
  fields: PRFormFields,
): PRFormFields => ({
  title: fields.title,
  type: fields.type,
  time: [fields.time[0], fields.time[1]],
  location: fields.location,
  minPartners: fields.minPartners,
  maxPartners: fields.maxPartners,
  partners: [...fields.partners],
  budget: fields.budget,
  preferences: [...fields.preferences],
  notes: fields.notes,
});

export const parseNullableNumber = (value: string): number | null => {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
