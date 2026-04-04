import { onMounted, onUnmounted, ref } from "vue";
import { isWeChatAbilityEnv } from "@/shared/wechat/ability-mocking";

const STORAGE_KEY = "__partner_up_home_bookmark_nudge_seen_date__";
const TIME_TRIGGER_MS = 14_000;
const BOTTOM_THRESHOLD_PX = 80;
const MIN_TIME_TRIGGER_DEPTH_PERCENT = 24;
const MIN_BOTTOM_TRIGGER_DEPTH_PERCENT = 55;

type BookmarkNudgeEnvironment = "wechat" | "browser";
type BookmarkNudgeTrigger = "time" | "bottom";

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const readSeenDate = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const markSeenToday = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, toLocalDateKey(new Date()));
  } catch {
    // Ignore localStorage write failures.
  }
};

const hasSeenToday = (): boolean => readSeenDate() === toLocalDateKey(new Date());

export const useLandingBookmarkNudge = () => {
  const isVisible = ref(false);
  const triggerDepth = ref(0);
  const triggerMode = ref<BookmarkNudgeTrigger>("time");
  const environment = ref<BookmarkNudgeEnvironment>("browser");
  let timerId: number | null = null;
  let pendingTimeTrigger = false;

  const getScrollDepthPercent = (): number => {
    if (typeof window === "undefined") return 0;
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    if (scrollableHeight <= 0) return 100;
    const depth = window.scrollY / scrollableHeight;
    return Math.max(0, Math.min(100, Math.round(depth * 100)));
  };

  const showNudge = (mode: BookmarkNudgeTrigger): void => {
    if (typeof window === "undefined") return;
    if (isVisible.value || hasSeenToday()) return;
    triggerMode.value = mode;
    triggerDepth.value = getScrollDepthPercent();
    isVisible.value = true;
  };

  const canShowByTime = (): boolean =>
    getScrollDepthPercent() >= MIN_TIME_TRIGGER_DEPTH_PERCENT;

  const maybeShowByTime = (): void => {
    if (typeof window === "undefined") return;
    if (isVisible.value || hasSeenToday()) return;

    if (canShowByTime()) {
      pendingTimeTrigger = false;
      showNudge("time");
      return;
    }

    pendingTimeTrigger = true;
  };

  const maybeFlushPendingTimeTrigger = (): void => {
    if (!pendingTimeTrigger) return;
    if (isVisible.value || hasSeenToday()) return;
    if (!canShowByTime()) return;

    pendingTimeTrigger = false;
    showNudge("time");
  };

  const maybeShowByBottom = (): void => {
    if (typeof window === "undefined") return;
    if (isVisible.value || hasSeenToday()) return;
    if (getScrollDepthPercent() < MIN_BOTTOM_TRIGGER_DEPTH_PERCENT) return;
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    if (scrollableHeight <= 0) return;

    const remaining = scrollableHeight - window.scrollY;
    if (remaining <= BOTTOM_THRESHOLD_PX) {
      showNudge("bottom");
    }
  };

  const hideForToday = (): void => {
    pendingTimeTrigger = false;
    markSeenToday();
    isVisible.value = false;
  };

  const handleScrollOrResize = (): void => {
    maybeFlushPendingTimeTrigger();
    maybeShowByBottom();
  };

  onMounted(() => {
    if (typeof window === "undefined") return;
    environment.value = isWeChatAbilityEnv() ? "wechat" : "browser";
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);
    timerId = window.setTimeout(() => {
      maybeShowByTime();
    }, TIME_TRIGGER_MS);
  });

  onUnmounted(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("scroll", handleScrollOrResize);
    window.removeEventListener("resize", handleScrollOrResize);
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
  });

  return {
    isVisible,
    triggerDepth,
    triggerMode,
    environment,
    hideForToday,
  };
};

export type { BookmarkNudgeEnvironment, BookmarkNudgeTrigger };
