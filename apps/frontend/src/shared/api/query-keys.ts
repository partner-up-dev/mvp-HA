import type { PRId } from "@partner-up-dev/backend";

export const queryKeys = {
  pr: {
    detail: (id: PRId | null) => ["partner-request", "detail", id] as const,
    mineCreated: () => ["partner-request", "mine", "created"] as const,
    mineJoined: () => ["partner-request", "mine", "joined"] as const,
    reimbursementStatus: (id: PRId | null) =>
      ["partner-request", "reimbursement-status", id] as const,
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
  wechat: {
    reminderSubscription: () => ["wechat", "reminder-subscription"] as const,
  },
} as const;
