const PENDING_WECHAT_ACTION_STORAGE_KEY = "partner_up_pending_wechat_action";
const PENDING_WECHAT_ACTION_TTL_MS = 10 * 60 * 1000;

type PendingActionBase = {
  createdAt: number;
};

type PendingAnchorJoinAction = PendingActionBase & {
  kind: "ANCHOR_PR_JOIN";
  prId: number;
};

type PendingAnchorExitAction = PendingActionBase & {
  kind: "ANCHOR_PR_EXIT";
  prId: number;
};

type PendingAnchorConfirmAction = PendingActionBase & {
  kind: "ANCHOR_PR_CONFIRM";
  prId: number;
};

type PendingAnchorCreateAction = PendingActionBase & {
  kind: "ANCHOR_EVENT_CREATE";
  eventId: number;
  batchId: number;
  locationId: string;
};

export type PendingWeChatAction =
  | PendingAnchorJoinAction
  | PendingAnchorExitAction
  | PendingAnchorConfirmAction
  | PendingAnchorCreateAction;

type NewPendingWeChatAction =
  | {
      kind: "ANCHOR_PR_JOIN";
      prId: number;
    }
  | {
      kind: "ANCHOR_PR_EXIT";
      prId: number;
    }
  | {
      kind: "ANCHOR_PR_CONFIRM";
      prId: number;
    }
  | {
      kind: "ANCHOR_EVENT_CREATE";
      eventId: number;
      batchId: number;
      locationId: string;
    };

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isRecent = (createdAt: number): boolean =>
  Date.now() - createdAt <= PENDING_WECHAT_ACTION_TTL_MS;

const isPendingWeChatAction = (value: unknown): value is PendingWeChatAction => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingWeChatAction>;
  if (
    typeof candidate.createdAt !== "number" ||
    !Number.isFinite(candidate.createdAt)
  ) {
    return false;
  }

  if (candidate.kind === "ANCHOR_PR_JOIN") {
    return isPositiveInteger(candidate.prId);
  }
  if (candidate.kind === "ANCHOR_PR_EXIT") {
    return isPositiveInteger(candidate.prId);
  }
  if (candidate.kind === "ANCHOR_PR_CONFIRM") {
    return isPositiveInteger(candidate.prId);
  }
  if (candidate.kind === "ANCHOR_EVENT_CREATE") {
    return (
      isPositiveInteger(candidate.eventId) &&
      isPositiveInteger(candidate.batchId) &&
      typeof candidate.locationId === "string" &&
      candidate.locationId.trim().length > 0
    );
  }

  return false;
};

export const setPendingWeChatAction = (action: NewPendingWeChatAction): void => {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingWeChatAction = {
      ...action,
      createdAt: Date.now(),
    };
    window.localStorage.setItem(
      PENDING_WECHAT_ACTION_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Ignore storage failures.
  }
};

export const clearPendingWeChatAction = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_WECHAT_ACTION_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

export const readPendingWeChatAction = (): PendingWeChatAction | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_WECHAT_ACTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPendingWeChatAction(parsed)) {
      clearPendingWeChatAction();
      return null;
    }
    if (!isRecent(parsed.createdAt)) {
      clearPendingWeChatAction();
      return null;
    }
    return parsed;
  } catch {
    clearPendingWeChatAction();
    return null;
  }
};
