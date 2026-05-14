import { onUnmounted, ref } from "vue";

type BookmarkPageNudgeSource = "home" | "anchor_event";

type StoredBookmarkPageNudgeCooldown = {
  cooldownUntilMs: number;
  source: BookmarkPageNudgeSource;
  action: "shown" | "acknowledged";
  updatedAtMs: number;
};

const STORAGE_KEY = "__partner_up_bookmark_page_nudge_v1__";
const BOOKMARK_PAGE_NUDGE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const isStoredCooldown = (
  value: unknown,
): value is StoredBookmarkPageNudgeCooldown => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.cooldownUntilMs === "number" &&
    Number.isFinite(record.cooldownUntilMs) &&
    (record.source === "home" || record.source === "anchor_event") &&
    (record.action === "shown" || record.action === "acknowledged") &&
    typeof record.updatedAtMs === "number" &&
    Number.isFinite(record.updatedAtMs)
  );
};

const readCooldownUntilMs = (): number => {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return 0;
    }

    const parsed = JSON.parse(rawValue) as unknown;
    return isStoredCooldown(parsed) ? parsed.cooldownUntilMs : 0;
  } catch {
    return 0;
  }
};

const writeCooldown = (payload: StoredBookmarkPageNudgeCooldown): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore localStorage write failures.
  }
};

export const useBookmarkPageNudgePrompt = (
  source: BookmarkPageNudgeSource,
) => {
  const isVisible = ref(false);
  let timerId: number | null = null;

  const isCooldownActiveNow = (): boolean => Date.now() < readCooldownUntilMs();

  const canPromptNow = (): boolean =>
    !isVisible.value && !isCooldownActiveNow();

  const clearTimer = (): void => {
    if (typeof window === "undefined" || timerId === null) {
      return;
    }

    window.clearTimeout(timerId);
    timerId = null;
  };

  const markCooldown = (
    action: StoredBookmarkPageNudgeCooldown["action"],
  ): void => {
    writeCooldown({
      cooldownUntilMs: Date.now() + BOOKMARK_PAGE_NUDGE_COOLDOWN_MS,
      source,
      action,
      updatedAtMs: Date.now(),
    });
  };

  const requestPrompt = (): boolean => {
    if (!canPromptNow()) {
      return false;
    }

    markCooldown("shown");
    isVisible.value = true;
    return true;
  };

  const requestPromptAfterDelay = (delayMs: number): void => {
    clearTimer();
    if (typeof window === "undefined") {
      return;
    }

    timerId = window.setTimeout(() => {
      timerId = null;
      requestPrompt();
    }, delayMs);
  };

  const acknowledgePrompt = (): void => {
    markCooldown("acknowledged");
    isVisible.value = false;
  };

  onUnmounted(() => {
    clearTimer();
  });

  return {
    isVisible,
    canPromptNow,
    requestPrompt,
    requestPromptAfterDelay,
    acknowledgePrompt,
  };
};

export type { BookmarkPageNudgeSource };
