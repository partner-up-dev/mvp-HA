export type AnalyticsEventName =
  | "pr_create_success"
  | "pr_join_success"
  | "pr_exit_success"
  | "pr_confirm_success"
  | "pr_checkin_submitted"
  | "share_method_switch"
  | "share_link_native_success"
  | "share_link_copy_success"
  | "share_link_failed";

export type AnalyticsPayloadMap = {
  pr_create_success: {
    prId: number;
    status: "DRAFT" | "OPEN";
  };
  pr_join_success: {
    prId: number;
  };
  pr_exit_success: {
    prId: number;
  };
  pr_confirm_success: {
    prId: number;
  };
  pr_checkin_submitted: {
    prId: number;
    didAttend: boolean;
    wouldJoinAgain: boolean;
  };
  share_method_switch: {
    methodId: string;
  };
  share_link_native_success: {
    url: string;
  };
  share_link_copy_success: {
    url: string;
  };
  share_link_failed: {
    url: string;
    stage: "native" | "copy";
  };
};

export type AnalyticsPayload<TEvent extends AnalyticsEventName> =
  AnalyticsPayloadMap[TEvent];

