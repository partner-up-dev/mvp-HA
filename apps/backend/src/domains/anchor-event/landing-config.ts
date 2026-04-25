import { z } from "zod";
import type { AnchorEventId } from "../../entities/anchor-event";

export const anchorEventLandingModeSchema = z.enum(["FORM", "CARD_RICH"]);
export type AnchorEventLandingMode = z.infer<
  typeof anchorEventLandingModeSchema
>;

export const anchorEventLandingVariantRatioOverrideSchema = z.object({
  FORM: z.number().int().nonnegative(),
  CARD_RICH: z.number().int().nonnegative(),
});
export type AnchorEventLandingVariantRatioOverride = z.infer<
  typeof anchorEventLandingVariantRatioOverrideSchema
>;

export const anchorEventLandingConfigSchema = z.object({
  variantRatioOverride: anchorEventLandingVariantRatioOverrideSchema.nullable(),
  assignmentRevision: z.number().int().positive(),
});
export type AnchorEventLandingConfig = z.infer<
  typeof anchorEventLandingConfigSchema
>;

export interface AnchorEventLandingAssignment {
  eventId: number;
  mode: AnchorEventLandingMode;
  assignmentRevision: number;
}

export const DEFAULT_ANCHOR_EVENT_LANDING_CONFIG: AnchorEventLandingConfig = {
  variantRatioOverride: null,
  assignmentRevision: 1,
};

const normalizeNonNegativeInteger = (value: unknown): number => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 0;
    }

    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 0;
};

const normalizePositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeVariantRatioOverride = (
  raw: unknown,
  enabledVariantsRaw?: unknown,
): AnchorEventLandingVariantRatioOverride | null => {
  const hasLegacyDisabledCardRich =
    Array.isArray(enabledVariantsRaw) &&
    !enabledVariantsRaw.some((value) => value === "CARD_RICH");

  if (hasLegacyDisabledCardRich) {
    return {
      FORM: 100,
      CARD_RICH: 0,
    };
  }

  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const value = raw as Record<string, unknown>;
  return {
    FORM: normalizeNonNegativeInteger(value.FORM),
    CARD_RICH: normalizeNonNegativeInteger(value.CARD_RICH),
  };
};

export const normalizeAnchorEventLandingConfig = (
  raw: unknown,
): AnchorEventLandingConfig => {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_ANCHOR_EVENT_LANDING_CONFIG;
  }

  const value = raw as Record<string, unknown>;
  const normalized: AnchorEventLandingConfig = {
    variantRatioOverride: normalizeVariantRatioOverride(
      value.variantRatioOverride,
      value.enabledVariants,
    ),
    assignmentRevision: normalizePositiveInteger(
      value.assignmentRevision,
      DEFAULT_ANCHOR_EVENT_LANDING_CONFIG.assignmentRevision,
    ),
  };

  return anchorEventLandingConfigSchema.safeParse(normalized).success
    ? normalized
    : DEFAULT_ANCHOR_EVENT_LANDING_CONFIG;
};

export const getAnchorEventLandingConfigKey = (eventId: AnchorEventId): string =>
  `anchor_event:${eventId}:landing_config`;

export const parseAnchorEventLandingConfig = (
  raw: string | null,
): AnchorEventLandingConfig => {
  if (!raw) {
    return DEFAULT_ANCHOR_EVENT_LANDING_CONFIG;
  }

  try {
    return normalizeAnchorEventLandingConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_ANCHOR_EVENT_LANDING_CONFIG;
  }
};

export const serializeAnchorEventLandingConfig = (
  config: AnchorEventLandingConfig,
): string => JSON.stringify(normalizeAnchorEventLandingConfig(config));

const resolveVariantWeights = (
  config: AnchorEventLandingConfig,
): AnchorEventLandingVariantRatioOverride => {
  const variantRatioOverride = config.variantRatioOverride ?? {
    FORM: 1,
    CARD_RICH: 1,
  };

  const weights: AnchorEventLandingVariantRatioOverride = {
    FORM: variantRatioOverride.FORM,
    CARD_RICH: variantRatioOverride.CARD_RICH,
  };

  if (weights.FORM + weights.CARD_RICH <= 0) {
    return {
      FORM: 1,
      CARD_RICH: 0,
    };
  }

  return weights;
};

export const assignAnchorEventLandingModeFromConfig = (
  config: AnchorEventLandingConfig,
  randomValue = Math.random(),
): AnchorEventLandingMode => {
  const weights = resolveVariantWeights(config);
  const totalWeight = weights.FORM + weights.CARD_RICH;
  if (totalWeight <= 0) {
    return "FORM";
  }

  const resolvedRandomValue = Math.min(Math.max(randomValue, 0), 1);
  const formThreshold = weights.FORM / totalWeight;

  return resolvedRandomValue < formThreshold ? "FORM" : "CARD_RICH";
};
