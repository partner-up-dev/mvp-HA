import type { PRId } from "@partner-up-dev/backend";

const normalizeIds = (ids: readonly PRId[]) => [...ids].sort((a, b) => a - b);

export const queryKeys = {
  pr: {
    detail: (id: PRId | null) => ["partner-request", "detail", id] as const,
    creator: (ids: readonly PRId[]) =>
      ["partner-request", "creator", normalizeIds(ids)] as const,
  },
  config: {
    public: (key: string) => ["config", "public", key] as const,
  },
  anchorEvent: {
    list: () => ["anchor-event", "list"] as const,
    detail: (eventId: number | null) =>
      ["anchor-event", "detail", eventId] as const,
  },
} as const;
