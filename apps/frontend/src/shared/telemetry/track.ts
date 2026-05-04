import type {
  TelemetryEventName,
  TelemetryPayload,
} from "@/shared/telemetry/events";
import { resolveCurrentSpmAttribution } from "@/shared/telemetry/spm-attribution";
import { sanitizeSpmValue } from "@/shared/url/spm";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";
import { client } from "@/lib/rpc";

type TelemetryEventRecord<
  TEvent extends TelemetryEventName = TelemetryEventName,
> = {
  event: TEvent;
  payload: Record<string, unknown>;
  at: string;
  path: string;
};

type PendingTelemetryEvent = {
  type: TelemetryEventName;
  source: "frontend";
  payload: Record<string, unknown>;
  occurredAt: string;
  sessionId?: string;
};

declare global {
  interface Window {
    __PARTNER_UP_TELEMETRY_EVENTS__?: TelemetryEventRecord[];
  }
}

const SESSION_ID_STORAGE_KEY = "__partner_up_telemetry_session_id__";
const FLUSH_BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 2_000;
const FLUSH_RETRY_MS = 5_000;
const MAX_QUEUE_SIZE = 1_000;

let telemetrySessionId: string | null = null;
let transportInitialized = false;
let flushTimer: number | null = null;
let flushInFlight = false;
const pendingQueue: PendingTelemetryEvent[] = [];

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const shouldAttachCurrentSpm = (path: string): boolean => {
  return !path.startsWith("/admin");
};

const withCurrentAttribution = (
  payload: Record<string, unknown>,
  path: string,
): Record<string, unknown> => {
  const explicitSpm =
    typeof payload.spm === "string" ? sanitizeSpmValue(payload.spm) : null;
  const attribution = explicitSpm ?? resolveCurrentSpmAttribution();
  if (!attribution || !shouldAttachCurrentSpm(path)) {
    return payload;
  }

  return {
    ...payload,
    spm: attribution,
    sourceQr:
      typeof payload.sourceQr === "string" && payload.sourceQr.trim().length > 0
        ? payload.sourceQr
        : attribution,
  };
};

const getCurrentPath = (): string => {
  if (typeof window === "undefined") return "/";
  return sanitizeSensitiveRoutePath(
    `${window.location.pathname}${window.location.search}`,
  );
};

const createSessionId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const resolveSessionId = (): string => {
  if (telemetrySessionId) return telemetrySessionId;
  if (typeof window === "undefined") {
    telemetrySessionId = "server";
    return telemetrySessionId;
  }

  try {
    const fromStorage = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (fromStorage) {
      telemetrySessionId = fromStorage;
      return telemetrySessionId;
    }
  } catch {
    // Ignore sessionStorage access errors.
  }

  telemetrySessionId = createSessionId();
  try {
    window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, telemetrySessionId);
  } catch {
    // Ignore sessionStorage write errors.
  }
  return telemetrySessionId;
};

const pushDebugEvent = (
  record: TelemetryEventRecord<TelemetryEventName>,
): void => {
  if (typeof window === "undefined") return;
  window.__PARTNER_UP_TELEMETRY_EVENTS__ ??= [];
  const events = window.__PARTNER_UP_TELEMETRY_EVENTS__;
  events.push(record);
  if (events.length > MAX_QUEUE_SIZE) {
    events.splice(0, events.length - MAX_QUEUE_SIZE);
  }
};

const scheduleFlush = (delayMs: number): void => {
  if (typeof window === "undefined") return;
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushPendingEvents();
  }, delayMs);
};

const enqueueEvent = (event: PendingTelemetryEvent): void => {
  pendingQueue.push(event);
  if (pendingQueue.length > MAX_QUEUE_SIZE) {
    pendingQueue.splice(0, pendingQueue.length - MAX_QUEUE_SIZE);
  }

  if (pendingQueue.length >= FLUSH_BATCH_SIZE) {
    void flushPendingEvents();
    return;
  }

  scheduleFlush(FLUSH_INTERVAL_MS);
};

const setupTransportLifecycleHooks = (): void => {
  if (transportInitialized || typeof window === "undefined") return;
  transportInitialized = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushPendingEvents();
    }
  });

  window.addEventListener("beforeunload", () => {
    void flushPendingEvents();
  });
};

const flushPendingEvents = async (): Promise<void> => {
  if (flushInFlight) return;
  if (pendingQueue.length === 0) return;

  flushInFlight = true;
  const batch = pendingQueue.splice(0, FLUSH_BATCH_SIZE);
  try {
    const response = await client.api.telemetry.events.$post({
      json: {
        events: batch,
      },
    });
    if (!response.ok) {
      throw new Error(`Telemetry ingest failed: ${response.status}`);
    }
  } catch (error) {
    pendingQueue.unshift(...batch);
    scheduleFlush(FLUSH_RETRY_MS);
    if (import.meta.env.DEV) {
      console.warn("[telemetry] failed to flush batch", error);
    }
  } finally {
    flushInFlight = false;
  }

  if (pendingQueue.length > 0) {
    scheduleFlush(0);
  }
};

export const trackEvent = <TEvent extends TelemetryEventName>(
  event: TEvent,
  payload: TelemetryPayload<TEvent>,
): void => {
  const occurredAt = new Date().toISOString();
  const currentPath = getCurrentPath();
  const payloadRecord = withCurrentAttribution(asRecord(payload), currentPath);
  const record: TelemetryEventRecord<TelemetryEventName> = {
    event,
    payload: payloadRecord,
    at: occurredAt,
    path: currentPath,
  };

  setupTransportLifecycleHooks();
  pushDebugEvent(record);
  enqueueEvent({
    type: event,
    source: "frontend",
    payload: payloadRecord,
    occurredAt,
    sessionId: resolveSessionId(),
  });

  if (import.meta.env.DEV) {
    console.debug("[telemetry]", record);
  }
};
