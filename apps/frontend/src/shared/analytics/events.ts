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
  | "share_link_failed";

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
