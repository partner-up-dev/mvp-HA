import type { PRId } from "@partner-up-dev/backend";

export const queryKeys = {
  pr: {
    detail: (id: PRId | null) => ["partner-request", "detail", id] as const,
    search: (eventId: number | null, dates: string[]) =>
      ["partner-request", "search", eventId, ...dates] as const,
    messages: (id: PRId | null) => ["partner-request", "messages", id] as const,
    bookingSupport: (id: PRId | null) =>
      ["partner-request", "booking-support", id] as const,
    reimbursementStatus: (id: PRId | null) =>
      ["partner-request", "reimbursement-status", id] as const,
    mineCreated: () => ["partner-request", "mine", "created"] as const,
    mineJoined: () => ["partner-request", "mine", "joined"] as const,
    partnerProfile: (prId: PRId | null, partnerId: number | null) =>
      ["partner-request", "partner-profile", prId, partnerId] as const,
  },
  config: {
    public: (key: string) => ["config", "public", key] as const,
  },
  meta: {
    build: () => ["meta", "build"] as const,
  },
  anchorEvent: {
    list: () => ["anchor-event", "list"] as const,
    detail: (eventId: number | null) =>
      ["anchor-event", "detail", eventId] as const,
    formMode: (eventId: number | null) =>
      ["anchor-event", "form-mode", eventId] as const,
    landingAssignment: (eventId: number | null) =>
      ["anchor-event", "landing-assignment", eventId] as const,
    demandCards: (eventId: number | null) =>
      ["anchor-event", "demand-cards", eventId] as const,
    formModeRecommendation: (
      eventId: number | null,
      locationId: string | null,
      startAt: string | null,
      preferencesKey: string,
    ) =>
      [
        "anchor-event",
        "form-mode-recommendation",
        eventId,
        locationId,
        startAt,
        preferencesKey,
      ] as const,
  },
  poi: {
    byIds: (idsCsv: string) => ["poi", "by-ids", idsCsv] as const,
  },
  admin: {
    anchorEventWorkspace: () => ["admin", "anchor-events", "workspace"] as const,
    anchorEventLandingConfig: (eventId: number | null) =>
      ["admin", "anchor-events", "landing-config", eventId] as const,
    anchorEventPreferenceTags: (eventId: number | null) =>
      ["admin", "anchor-events", "preference-tags", eventId] as const,
    pois: () => ["admin", "pois"] as const,
    poisByIds: (idsCsv: string) => ["admin", "pois", "by-ids", idsCsv] as const,
    bookingSupport: (eventId: number | null) =>
      ["admin", "booking-support", eventId] as const,
    bookingExecutionWorkspace: () =>
      ["admin", "booking-execution", "workspace"] as const,
    prWorkspace: () => ["admin", "pr-workspace"] as const,
    prMessages: (id: PRId | null) =>
      ["admin", "pr", "messages", id] as const,
  },
  wechat: {
    notificationSubscriptions: () =>
      ["wechat", "notification-subscriptions"] as const,
    reminderSubscription: () => ["wechat", "reminder-subscription"] as const,
  },
  user: {
    me: () => ["user", "me"] as const,
  },
} as const;
