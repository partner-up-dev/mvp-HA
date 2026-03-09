import type { PRId } from "@partner-up-dev/backend";

export const queryKeys = {
  pr: {
    mineCreated: () => ["partner-request", "mine", "created"] as const,
    mineJoined: () => ["partner-request", "mine", "joined"] as const,
  },
  communityPR: {
    detail: (id: PRId | null) => ["community-pr", "detail", id] as const,
  },
  anchorPR: {
    detail: (id: PRId | null) => ["anchor-pr", "detail", id] as const,
    bookingSupport: (id: PRId | null) =>
      ["anchor-pr", "booking-support", id] as const,
    alternativeBatches: (id: PRId | null) =>
      ["anchor-pr", "alternative-batches", id] as const,
    reimbursementStatus: (id: PRId | null) =>
      ["anchor-pr", "reimbursement-status", id] as const,
  },
  config: {
    public: (key: string) => ["config", "public", key] as const,
  },
  anchorEvent: {
    list: () => ["anchor-event", "list"] as const,
    detail: (eventId: number | null) =>
      ["anchor-event", "detail", eventId] as const,
  },
  poi: {
    byIds: (idsCsv: string) => ["poi", "by-ids", idsCsv] as const,
  },
  admin: {
    bookingSupport: (eventId: number | null) =>
      ["admin", "booking-support", eventId] as const,
    anchorWorkspace: () => ["admin", "anchor-workspace"] as const,
  },
  wechat: {
    reminderSubscription: () => ["wechat", "reminder-subscription"] as const,
  },
} as const;
