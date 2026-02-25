import type {
  AnalyticsEventName,
  AnalyticsPayload,
} from "@/shared/analytics/events";

type AnalyticsEventRecord<TEvent extends AnalyticsEventName = AnalyticsEventName> = {
  event: TEvent;
  payload: AnalyticsPayload<TEvent>;
  at: string;
  path: string;
};

declare global {
  interface Window {
    __PARTNER_UP_ANALYTICS_EVENTS__?: AnalyticsEventRecord[];
  }
}

const getCurrentPath = (): string => {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
};

const pushDebugEvent = <TEvent extends AnalyticsEventName>(
  record: AnalyticsEventRecord<TEvent>,
): void => {
  if (typeof window === "undefined") return;
  window.__PARTNER_UP_ANALYTICS_EVENTS__ ??= [];
  window.__PARTNER_UP_ANALYTICS_EVENTS__.push(record);
};

export const trackEvent = <TEvent extends AnalyticsEventName>(
  event: TEvent,
  payload: AnalyticsPayload<TEvent>,
): void => {
  const record: AnalyticsEventRecord<TEvent> = {
    event,
    payload,
    at: new Date().toISOString(),
    path: getCurrentPath(),
  };

  pushDebugEvent(record);

  if (import.meta.env.DEV) {
    console.debug("[analytics]", record);
  }
};

