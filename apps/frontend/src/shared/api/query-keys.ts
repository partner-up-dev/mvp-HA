import type { PRId } from "@partner-up-dev/backend";

export const queryKeys = {
  pr: {
    detail: (id: PRId | null) => ["partner-request", "detail", id] as const,
    mineCreated: () => ["partner-request", "mine", "created"] as const,
    mineJoined: () => ["partner-request", "mine", "joined"] as const,
    partnerProfile: (prId: PRId | null, partnerId: number | null) =>
      ["partner-request", "partner-profile", prId, partnerId] as const,
  },
  communityPR: {
    detail: (id: PRId | null) => ["community-pr", "detail", id] as const,
  },
  anchorPR: {
    detail: (id: PRId | null) => ["anchor-pr", "detail", id] as const,
    search: (eventId: number | null, dates: string[]) =>
      ["anchor-pr", "search", eventId, ...dates] as const,
    messages: (id: PRId | null) => ["anchor-pr", "messages", id] as const,
    bookingSupport: (id: PRId | null) =>
      ["anchor-pr", "booking-support", id] as const,
    reimbursementStatus: (id: PRId | null) =>
      ["anchor-pr", "reimbursement-status", id] as const,
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
    demandCards: (eventId: number | null) =>
      ["anchor-event", "demand-cards", eventId] as const,
  },
  poi: {
    byIds: (idsCsv: string) => ["poi", "by-ids", idsCsv] as const,
  },
  admin: {
    pois: () => ["admin", "pois"] as const,
    poisByIds: (idsCsv: string) => ["admin", "pois", "by-ids", idsCsv] as const,
    bookingSupport: (eventId: number | null) =>
      ["admin", "booking-support", eventId] as const,
    bookingExecutionWorkspace: () =>
      ["admin", "booking-execution", "workspace"] as const,
    anchorWorkspace: () => ["admin", "anchor-workspace"] as const,
    anchorPRMessages: (id: PRId | null) =>
      ["admin", "anchor-pr", "messages", id] as const,
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
