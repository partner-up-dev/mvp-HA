export type PRKind = "ANCHOR" | "COMMUNITY";

export type CanonicalAnalyticsEventName =
  | "page_view"
  | "pr_create_success"
  | "pr_join_success"
  | "pr_exit_success"
  | "pr_confirm_success"
  | "pr_checkin_submitted"
  | "share_method_switch"
  | "share_link_native_success"
  | "share_link_copy_success"
  | "share_link_failed"
  | "share_session_started"
  | "share_descriptor_submitted"
  | "share_descriptor_discarded_stale"
  | "share_apply_fallback_success"
  | "share_apply_base_success"
  | "share_apply_enriched_success"
  | "share_apply_failed"
  | "share_replay_triggered"
  | "home_hero_primary_click"
  | "home_event_section_impression"
  | "home_event_card_impression"
  | "home_event_card_click"
  | "home_event_all_click"
  | "home_event_highlight_click"
  | "home_event_plaza_entry_click"
  | "home_create_entry_click"
  | "home_bookmark_nudge_shown"
  | "home_bookmark_action_click"
  | "pr_primary_cta_impression"
  | "pr_primary_cta_click"
  | "pr_lane_expand"
  | "pr_recovery_accept"
  | "pr_secondary_action_click";

export type LegacyAnalyticsEventName =
  | "join_success"
  | "slot_confirmed"
  | "check_in_submitted"
  | "share_clicked";

export type AnalyticsEventName =
  | CanonicalAnalyticsEventName
  | LegacyAnalyticsEventName;

export const LEGACY_ANALYTICS_EVENT_NAME_MAP: Record<
  LegacyAnalyticsEventName,
  CanonicalAnalyticsEventName
> = {
  join_success: "pr_join_success",
  slot_confirmed: "pr_confirm_success",
  check_in_submitted: "pr_checkin_submitted",
  share_clicked: "share_method_switch",
};

type AnalyticsContextPayload = {
  scenarioType?: string;
  actorId?: string;
  spm?: string;
};

type PRContextPayload = AnalyticsContextPayload & {
  prId?: number;
  prKind?: PRKind;
};

type ShareContextPayload = AnalyticsContextPayload & {
  prId?: number;
};

type ShareRoutePhase = "FALLBACK" | "BASE" | "ENRICHED";

type ShareLifecyclePayload = ShareContextPayload & {
  routeSessionId: string;
  entityKey?: string | null;
  revision?: string;
};

type CanonicalAnalyticsPayloadMap = {
  page_view: PRContextPayload & {
    page: string;
    routeName?: string;
  };
  pr_create_success: PRContextPayload & {
    prId: number;
    status: "DRAFT" | "OPEN";
  };
  pr_join_success: PRContextPayload & {
    prId: number;
  };
  pr_exit_success: PRContextPayload & {
    prId: number;
  };
  pr_confirm_success: PRContextPayload & {
    prId: number;
  };
  pr_checkin_submitted: PRContextPayload & {
    prId: number;
    didAttend: boolean;
    wouldJoinAgain: boolean;
  };
  share_method_switch: ShareContextPayload & {
    methodId: string;
  };
  share_link_native_success: ShareContextPayload & {
    url: string;
  };
  share_link_copy_success: ShareContextPayload & {
    url: string;
  };
  share_link_failed: ShareContextPayload & {
    url: string;
    stage: "native" | "copy";
  };
  share_session_started: ShareLifecyclePayload & {
    hasFallback: boolean;
  };
  share_descriptor_submitted: ShareLifecyclePayload & {
    phase: ShareRoutePhase;
  };
  share_descriptor_discarded_stale: ShareLifecyclePayload & {
    phase: ShareRoutePhase;
    reason: "session_mismatch" | "phase_regression";
    currentRouteSessionId?: string | null;
  };
  share_apply_fallback_success: ShareLifecyclePayload & {
    phase: "FALLBACK";
  };
  share_apply_base_success: ShareLifecyclePayload & {
    phase: "BASE";
  };
  share_apply_enriched_success: ShareLifecyclePayload & {
    phase: "ENRICHED";
  };
  share_apply_failed: ShareLifecyclePayload & {
    phase: ShareRoutePhase;
    stage: "apply";
    message: string;
  };
  share_replay_triggered: ShareLifecyclePayload & {
    phase: ShareRoutePhase;
    trigger: "pageshow" | "visibilitychange" | "manual" | "sdk_ready";
  };
  home_hero_primary_click: PRContextPayload & {
    target: "event-plaza";
  };
  home_event_section_impression: PRContextPayload & {
    source: "landing_v2";
    hasMappedUnit: boolean;
    unitCount: number;
  };
  home_event_card_impression: PRContextPayload & {
    unitKey: "badminton" | "running" | "teaTalk" | "speaking";
    isLead: boolean;
    remainingSlots: number | null;
    startsSoon: boolean;
    eventId?: number;
  };
  home_event_card_click: PRContextPayload & {
    unitKey: "badminton" | "running" | "teaTalk" | "speaking";
    isLead: boolean;
    remainingSlots: number | null;
    startsSoon: boolean;
    eventId?: number;
  };
  home_event_all_click: PRContextPayload & {
    source: "landing_v2";
  };
  home_event_highlight_click: PRContextPayload & {
    eventId: number;
    index: number;
  };
  home_event_plaza_entry_click: PRContextPayload & {
    source: "landing";
  };
  home_create_entry_click: PRContextPayload & {
    source: "hero_secondary" | "fallback_section";
    target: "pr-create";
  };
  home_bookmark_nudge_shown: PRContextPayload & {
    triggerDepthPercent: number;
    triggerMode: "time" | "bottom";
    environment: "wechat" | "browser";
  };
  home_bookmark_action_click: PRContextPayload & {
    action:
      | "open_web_page_qr"
      | "open_official_account_qr"
      | "dismiss";
    environment: "wechat" | "browser";
  };
  pr_primary_cta_impression: PRContextPayload & {
    prId: number;
    ctaType: "JOIN" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT";
    viewerState:
      | "CREATOR"
      | "PARTICIPANT"
      | "VISITOR_JOINABLE"
      | "VISITOR_BLOCKED";
  };
  pr_primary_cta_click: PRContextPayload & {
    prId: number;
    ctaType: "JOIN" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT";
    viewerState:
      | "CREATOR"
      | "PARTICIPANT"
      | "VISITOR_JOINABLE"
      | "VISITOR_BLOCKED";
  };
  pr_lane_expand: PRContextPayload & {
    prId: number;
    laneId: "RECOVERY" | "AWARENESS" | "LOGISTICS" | "SECONDARY";
    entry:
      | "PRIMARY_SHORTCUT"
      | "PAGE_SCROLL"
      | "DIRECT_INTERACTION"
      | "UNKNOWN";
  };
  pr_recovery_accept: PRContextPayload & {
    prId: number;
    targetType: "SAME_BATCH" | "ALTERNATIVE_BATCH";
    targetPrId?: number;
    targetTimeWindowStart?: string | null;
    targetTimeWindowEnd?: string | null;
  };
  pr_secondary_action_click: PRContextPayload & {
    prId: number;
    actionType:
      | "SHARE_METHOD_SWITCH"
      | "SHARE_LINK_TRIGGER"
      | "CREATOR_EDIT_CONTENT"
      | "CREATOR_MODIFY_STATUS";
    methodId?: string;
  };
};

type LegacyAnalyticsPayloadMap = {
  join_success: CanonicalAnalyticsPayloadMap["pr_join_success"];
  slot_confirmed: CanonicalAnalyticsPayloadMap["pr_confirm_success"];
  check_in_submitted: CanonicalAnalyticsPayloadMap["pr_checkin_submitted"];
  share_clicked: CanonicalAnalyticsPayloadMap["share_method_switch"];
};

export type AnalyticsPayloadMap = CanonicalAnalyticsPayloadMap &
  LegacyAnalyticsPayloadMap;

export type AnalyticsPayload<TEvent extends AnalyticsEventName> =
  AnalyticsPayloadMap[TEvent];
