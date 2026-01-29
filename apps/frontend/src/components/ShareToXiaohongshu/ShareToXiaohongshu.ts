import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

/**
 * Props for ShareToXiaohongshu component
 */
export interface ShareToXiaohongshuProps {
  shareUrl: string;
  prData: ParsedPartnerRequest;
}

/**
 * Timing constants for animations and transitions
 */
export const TIMING_CONSTANTS = {
  CAPTION_TRANSITION_DELAY: 150, // ms - delay before showing new caption
  POSTER_GENERATION_DELAY: 1500, // ms - delay to show placeholder longer
  POSTER_TRANSITION_DURATION: 300, // ms - animation duration
} as const;

/**
 * Copy text to clipboard with fallback support
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error("Clipboard copy failed");
  }
}

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
