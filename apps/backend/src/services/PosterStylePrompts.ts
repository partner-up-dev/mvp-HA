import type { PosterStyle } from "../lib/poster";

export const POSTER_STYLE_PROMPTS: Record<PosterStyle, string> = {
  minimal: `Create a clean, minimalist poster. Focus on whitespace, crisp typography, and a restrained palette. Use subtle grid lines or hairline dividers for structure.`,
  elegant: `Design an elegant poster with refined typography, balanced spacing, and sophisticated contrast. Use subtle gradients, thin borders, and soft shadows.`,
  warm: `Design a warm, welcoming poster with soft gradients, cozy colors, and gentle shapes. Use rounded elements and friendly typography.`,
  modern: `Create a modern poster using bold typography, geometric shapes, and dynamic layout. Use high contrast and clean grid structure.`,
  professional: `Create a professional, formal poster with clear hierarchy, muted palette, and precise alignment. Emphasize clarity and information hierarchy.`,
};
