import { z } from "zod";

export const posterStyleSchema = z.enum([
  "minimal",
  "elegant",
  "warm",
  "modern",
  "professional",
]);

export const posterRatioSchema = z.enum(["3:4", "1:1", "4:3"]);

export const posterGenerationSchema = z.object({
  caption: z.string().trim().min(1).max(220),
  style: posterStyleSchema,
  ratio: posterRatioSchema.default("3:4"),
  saveOnServer: z.boolean().optional(),
  includeAiGraphics: z.boolean().optional(),
});

export type PosterStyle = z.infer<typeof posterStyleSchema>;
export type PosterRatio = z.infer<typeof posterRatioSchema>;
export type PosterGenerationRequest = z.infer<typeof posterGenerationSchema>;

export interface PosterDimensions {
  width: number;
  height: number;
}

const POSTER_DIMENSIONS: Record<PosterRatio, PosterDimensions> = {
  "3:4": { width: 1080, height: 1440 },
  "1:1": { width: 1080, height: 1080 },
  "4:3": { width: 1440, height: 1080 },
};

export const getPosterDimensions = (ratio: PosterRatio): PosterDimensions =>
  POSTER_DIMENSIONS[ratio];
