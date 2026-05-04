export const COLD_START_ANALYTICS_EVENT_TYPES = [
  "page_view",
  "anchor_event_form_impression",
  "anchor_event_form_started",
  "anchor_event_form_recommendation_impression",
  "anchor_event_recommendation_result",
  "event_assisted_create_result",
  "pr_join_result",
  "pr_waitlist_result",
] as const;

export type ColdStartAnalyticsEventType =
  (typeof COLD_START_ANALYTICS_EVENT_TYPES)[number];
