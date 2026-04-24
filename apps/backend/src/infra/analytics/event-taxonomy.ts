export const canonicalAnalyticsEventTypes = [
  "page_view",
  "pr_create_success",
  "pr_join_success",
  "pr_exit_success",
  "pr_confirm_success",
  "pr_checkin_submitted",
  "share_method_switch",
  "share_link_native_success",
  "share_link_copy_success",
  "share_link_failed",
  "share_session_started",
  "share_descriptor_submitted",
  "share_descriptor_discarded_stale",
  "share_apply_fallback_success",
  "share_apply_base_success",
  "share_apply_enriched_success",
  "share_apply_failed",
  "share_replay_triggered",
  "home_hero_primary_click",
  "home_event_section_impression",
  "home_event_card_impression",
  "home_event_card_click",
  "home_event_all_click",
  "home_event_highlight_click",
  "home_event_plaza_entry_click",
  "home_create_entry_click",
  "home_bookmark_nudge_shown",
  "home_bookmark_action_click",
  "pr_primary_cta_impression",
  "pr_primary_cta_click",
  "pr_lane_expand",
  "pr_recovery_accept",
  "pr_secondary_action_click",
] as const;

export type CanonicalAnalyticsEventType =
  (typeof canonicalAnalyticsEventTypes)[number];

export const legacyAnalyticsEventTypeMap = {
  join_success: "pr_join_success",
  slot_confirmed: "pr_confirm_success",
  check_in_submitted: "pr_checkin_submitted",
  share_clicked: "share_method_switch",
} as const;

export type LegacyAnalyticsEventType = keyof typeof legacyAnalyticsEventTypeMap;

export const derivedOnlyAnalyticsEventTypes = [
  "share_converted",
  "repeat_join_14d",
] as const;

export type DerivedOnlyAnalyticsEventType =
  (typeof derivedOnlyAnalyticsEventTypes)[number];

export type AnalyticsEventType =
  | CanonicalAnalyticsEventType
  | LegacyAnalyticsEventType
  | DerivedOnlyAnalyticsEventType;

export const acceptedAnalyticsEventTypes = [
  ...canonicalAnalyticsEventTypes,
  "join_success",
  "slot_confirmed",
  "check_in_submitted",
  "share_clicked",
  ...derivedOnlyAnalyticsEventTypes,
] as const satisfies readonly AnalyticsEventType[];
