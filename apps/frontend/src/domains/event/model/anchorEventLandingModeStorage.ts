export type AnchorEventLandingMode = "FORM" | "CARD_RICH";

const STORAGE_KEY_PREFIX = "partnerup:anchor-event-landing-mode";

const buildStorageKey = (
  eventId: number,
  assignmentRevision: number,
): string => `${STORAGE_KEY_PREFIX}:${eventId}:${assignmentRevision}`;

const isValidAnchorEventLandingMode = (
  value: unknown,
): value is AnchorEventLandingMode =>
  value === "FORM" || value === "CARD_RICH";

export const readStoredAnchorEventLandingMode = (
  eventId: number,
  assignmentRevision: number,
): AnchorEventLandingMode | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      buildStorageKey(eventId, assignmentRevision),
    );
    return isValidAnchorEventLandingMode(raw) ? raw : null;
  } catch {
    return null;
  }
};

export const writeStoredAnchorEventLandingMode = (
  eventId: number,
  assignmentRevision: number,
  mode: AnchorEventLandingMode,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      buildStorageKey(eventId, assignmentRevision),
      mode,
    );
  } catch {
    // Ignore localStorage failures.
  }
};
