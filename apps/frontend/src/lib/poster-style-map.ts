import type { PosterStyle } from "@partner-up-dev/backend";

const POSTER_STYLE_ORDER: PosterStyle[] = [
  "elegant",
  "minimal",
  "warm",
  "modern",
  "professional",
];

export const mapStyleIndexToPosterStyle = (styleIndex: number): PosterStyle => {
  const count = POSTER_STYLE_ORDER.length;
  const normalized = ((styleIndex % count) + count) % count;
  return POSTER_STYLE_ORDER[normalized];
};
