import type { PRShareProps } from "@/components/share/types";

/**
 * Props for ShareToXiaohongshu component
 */
export type ShareToXiaohongshuProps = PRShareProps;

/**
 * Timing constants for animations and transitions
 */
export const TIMING_CONSTANTS = {
  CAPTION_TRANSITION_DELAY: 150, // ms - delay before showing new caption
  POSTER_GENERATION_DELAY: 0, // ms - delay to show placeholder longer
  POSTER_TRANSITION_DURATION: 300, // ms - animation duration
} as const;

/**
 * Download blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format caption and URL for sharing
 */
export function formatCaptionWithUrl(caption: string, url: string): string {
  return `${caption}\n\n${url}`;
}

/**
 * Generate poster filename with timestamp
 */
export function generatePosterFilename(): string {
  return `poster-${Date.now()}.png`;
}

/**
 * Delay execution for UI choreography
 */
export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
