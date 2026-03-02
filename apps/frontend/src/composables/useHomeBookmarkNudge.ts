import { onMounted, onUnmounted, ref } from "vue";
import { isWeChatBrowser } from "@/lib/browser-detection";

const STORAGE_KEY = "__partner_up_home_bookmark_nudge_seen_date__";
const TIME_TRIGGER_MS = 5_000;
const BOTTOM_THRESHOLD_PX = 24;

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

export const useHomeBookmarkNudge = () => {
  const isVisible = ref(false);
  const triggerDepth = ref(0);
  const triggerMode = ref<BookmarkNudgeTrigger>("time");
  const environment = ref<BookmarkNudgeEnvironment>("browser");
  let timerId: number | null = null;

  const getScrollDepthPercent = (): number => {
    if (typeof window === "undefined") return 0;
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    if (scrollableHeight <= 0) return 0;
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

  const maybeShowByBottom = (): void => {
    if (typeof window === "undefined") return;
    if (isVisible.value || hasSeenToday()) return;
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    if (scrollableHeight <= 0) return;

    const remaining = scrollableHeight - window.scrollY;
    if (remaining <= BOTTOM_THRESHOLD_PX) {
      showNudge("bottom");
    }
  };

  const hideForToday = (): void => {
    markSeenToday();
    isVisible.value = false;
  };

  onMounted(() => {
    if (typeof window === "undefined") return;
    environment.value = isWeChatBrowser() ? "wechat" : "browser";
    window.addEventListener("scroll", maybeShowByBottom, { passive: true });
    window.addEventListener("resize", maybeShowByBottom);
    timerId = window.setTimeout(() => {
      showNudge("time");
    }, TIME_TRIGGER_MS);
  });

  onUnmounted(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("scroll", maybeShowByBottom);
    window.removeEventListener("resize", maybeShowByBottom);
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
