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
  | "home_hero_primary_click"
  | "home_event_section_impression"
  | "home_event_card_impression"
  | "home_event_card_click"
  | "home_event_all_click"
  | "home_event_highlight_click"
  | "home_event_plaza_entry_click"
  | "home_bookmark_nudge_shown"
  | "home_bookmark_action_click"
  | "anchor_pr_primary_cta_impression"
  | "anchor_pr_primary_cta_click"
  | "anchor_pr_lane_expand"
  | "anchor_pr_recovery_accept"
  | "anchor_pr_secondary_action_click";

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

type PRContextPayload = {
  prId?: number;
  prKind?: PRKind;
  scenarioType?: string;
  actorId?: string;
  spm?: string;
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
  share_method_switch: PRContextPayload & {
    methodId: string;
  };
  share_link_native_success: PRContextPayload & {
    url: string;
  };
  share_link_copy_success: PRContextPayload & {
    url: string;
  };
  share_link_failed: PRContextPayload & {
    url: string;
    stage: "native" | "copy";
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
  home_bookmark_nudge_shown: PRContextPayload & {
    triggerDepthPercent: number;
    triggerMode: "time" | "bottom";
    environment: "wechat" | "browser";
  };
  home_bookmark_action_click: PRContextPayload & {
    action: "bookmark_hint" | "copy_link" | "dismiss";
    environment: "wechat" | "browser";
  };
  anchor_pr_primary_cta_impression: PRContextPayload & {
    prId: number;
    ctaType: "JOIN" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT";
    viewerState:
      | "CREATOR"
      | "PARTICIPANT"
      | "VISITOR_JOINABLE"
      | "VISITOR_BLOCKED";
  };
  anchor_pr_primary_cta_click: PRContextPayload & {
    prId: number;
    ctaType: "JOIN" | "CONFIRM_SLOT" | "CHECK_IN" | "EXIT";
    viewerState:
      | "CREATOR"
      | "PARTICIPANT"
      | "VISITOR_JOINABLE"
      | "VISITOR_BLOCKED";
  };
  anchor_pr_lane_expand: PRContextPayload & {
    prId: number;
    laneId: "RECOVERY" | "AWARENESS" | "LOGISTICS" | "SECONDARY";
    entry:
      | "PRIMARY_SHORTCUT"
      | "PAGE_SCROLL"
      | "DIRECT_INTERACTION"
      | "UNKNOWN";
  };
  anchor_pr_recovery_accept: PRContextPayload & {
    prId: number;
    targetType: "SAME_BATCH" | "ALTERNATIVE_BATCH";
    targetPrId?: number;
    targetTimeWindowStart?: string | null;
    targetTimeWindowEnd?: string | null;
  };
  anchor_pr_secondary_action_click: PRContextPayload & {
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
