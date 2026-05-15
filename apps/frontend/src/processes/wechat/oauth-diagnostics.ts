const FLOW_STARTED_AT_STORAGE_KEY =
  "partner_up_wechat_oauth_diagnostic_started_at";

type DiagnosticDetails = Record<string, unknown>;

const nowMs = (): number => Date.now();

const readFlowStartedAt = (): number | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(FLOW_STARTED_AT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeFlowStartedAt = (startedAt: number): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      FLOW_STARTED_AT_STORAGE_KEY,
      String(startedAt),
    );
  } catch {
    // The console log still carries local timestamps when storage is blocked.
  }
};

const clearFlowStartedAt = (): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(FLOW_STARTED_AT_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
};

const resolvePathOnly = (rawUrl: string | null | undefined): string | null => {
  if (!rawUrl || typeof window === "undefined") return null;

  try {
    const url = new URL(rawUrl, window.location.origin);
    return `${url.pathname}${url.hash ? "#hash" : ""}`;
  } catch {
    return null;
  }
};

export const markWeChatOAuthDiagnosticStart = (
  details: DiagnosticDetails = {},
): void => {
  const startedAt = nowMs();
  writeFlowStartedAt(startedAt);
  logWeChatOAuthDiagnostic("flow.start", details, startedAt);
};

export const clearWeChatOAuthDiagnosticFlow = (
  details: DiagnosticDetails = {},
): void => {
  logWeChatOAuthDiagnostic("flow.clear", details);
  clearFlowStartedAt();
};

export const logWeChatOAuthDiagnostic = (
  step: string,
  details: DiagnosticDetails = {},
  startedAtOverride?: number,
): void => {
  if (typeof window === "undefined") return;

  const currentTimeMs = nowMs();
  const startedAt = startedAtOverride ?? readFlowStartedAt();
  const elapsedMs = startedAt ? currentTimeMs - startedAt : null;

  console.log("[wechat-oauth]", {
    step,
    at: new Date(currentTimeMs).toISOString(),
    elapsedMs,
    page: `${window.location.pathname}${window.location.hash ? "#hash" : ""}`,
    ...details,
  });
};

export const createWeChatOAuthDiagnosticTimer = (): (() => number) => {
  const startedAt =
    typeof performance === "undefined" ? nowMs() : performance.now();
  return () => {
    const endedAt =
      typeof performance === "undefined" ? nowMs() : performance.now();
    return Math.round(endedAt - startedAt);
  };
};

export const toDiagnosticPath = (rawUrl: string | null | undefined): string | null =>
  resolvePathOnly(rawUrl);
