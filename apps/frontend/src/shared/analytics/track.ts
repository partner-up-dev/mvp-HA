import type {
  AnalyticsEventName,
  AnalyticsPayload,
  CanonicalAnalyticsEventName,
  LegacyAnalyticsEventName,
} from "@/shared/analytics/events";
import { LEGACY_ANALYTICS_EVENT_NAME_MAP } from "@/shared/analytics/events";
import { client } from "@/lib/rpc";

type AnalyticsEventRecord<
  TEvent extends CanonicalAnalyticsEventName = CanonicalAnalyticsEventName,
> = {
  event: TEvent;
  payload: Record<string, unknown>;
  at: string;
  path: string;
};

type PendingAnalyticsEvent = {
  type: CanonicalAnalyticsEventName;
  payload: Record<string, unknown>;
  occurredAt: string;
  sessionId?: string;
};

declare global {
  interface Window {
    __PARTNER_UP_ANALYTICS_EVENTS__?: AnalyticsEventRecord[];
  }
}

const SESSION_ID_STORAGE_KEY = "__partner_up_analytics_session_id__";
const FLUSH_BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 2_000;
const FLUSH_RETRY_MS = 5_000;
const MAX_QUEUE_SIZE = 1_000;

let analyticsSessionId: string | null = null;
let transportInitialized = false;
let flushTimer: number | null = null;
let flushInFlight = false;
const pendingQueue: PendingAnalyticsEvent[] = [];

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const isLegacyEventName = (
  value: AnalyticsEventName,
): value is LegacyAnalyticsEventName => {
  return Object.prototype.hasOwnProperty.call(
    LEGACY_ANALYTICS_EVENT_NAME_MAP,
    value,
  );
};

const toCanonicalEventName = (
  event: AnalyticsEventName,
): CanonicalAnalyticsEventName => {
  if (isLegacyEventName(event)) {
    return LEGACY_ANALYTICS_EVENT_NAME_MAP[event];
  }
  return event;
};

const getCurrentPath = (): string => {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
};

const createSessionId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const resolveSessionId = (): string => {
  if (analyticsSessionId) return analyticsSessionId;
  if (typeof window === "undefined") {
    analyticsSessionId = "server";
    return analyticsSessionId;
  }

  try {
    const fromStorage = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (fromStorage) {
      analyticsSessionId = fromStorage;
      return analyticsSessionId;
    }
  } catch {
    // Ignore sessionStorage access errors.
  }

  analyticsSessionId = createSessionId();
  try {
    window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, analyticsSessionId);
  } catch {
    // Ignore sessionStorage write errors.
  }
  return analyticsSessionId;
};

const pushDebugEvent = (
  record: AnalyticsEventRecord<CanonicalAnalyticsEventName>,
): void => {
  if (typeof window === "undefined") return;
  window.__PARTNER_UP_ANALYTICS_EVENTS__ ??= [];
  const events = window.__PARTNER_UP_ANALYTICS_EVENTS__;
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

const enqueueEvent = (event: PendingAnalyticsEvent): void => {
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
    const response = await client.api.analytics.events.$post({
      json: {
        events: batch,
      },
    });
    if (!response.ok) {
      throw new Error(`Analytics ingest failed: ${response.status}`);
    }
  } catch (error) {
    pendingQueue.unshift(...batch);
    scheduleFlush(FLUSH_RETRY_MS);
    if (import.meta.env.DEV) {
      console.warn("[analytics] failed to flush batch", error);
    }
  } finally {
    flushInFlight = false;
  }

  if (pendingQueue.length > 0) {
    scheduleFlush(0);
  }
};

export const trackEvent = <TEvent extends AnalyticsEventName>(
  event: TEvent,
  payload: AnalyticsPayload<TEvent>,
): void => {
  const canonicalEvent = toCanonicalEventName(event);
  const occurredAt = new Date().toISOString();
  const payloadRecord = asRecord(payload);
  const record: AnalyticsEventRecord<CanonicalAnalyticsEventName> = {
    event: canonicalEvent,
    payload: payloadRecord,
    at: occurredAt,
    path: getCurrentPath(),
  };

  setupTransportLifecycleHooks();
  pushDebugEvent(record);
  enqueueEvent({
    type: canonicalEvent,
    payload: payloadRecord,
    occurredAt,
    sessionId: resolveSessionId(),
  });

  if (import.meta.env.DEV) {
    console.debug("[analytics]", record);
  }
};
