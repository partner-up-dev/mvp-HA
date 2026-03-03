import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";

type RotationMode = "typewriter" | "swap";
type TransitionStrategy = "diff" | "rewrite";

export interface UseRotatingTextWithTypeWriterOptions {
  mode?: RotationMode;
  transitionStrategy?: TransitionStrategy;
  holdMs?: number;
  swapIntervalMs?: number;
  typeStepMs?: number;
  eraseStepMs?: number;
  loop?: boolean;
}

const DEFAULT_HOLD_MS = 1100;
const DEFAULT_SWAP_INTERVAL_MS = 1700;
const DEFAULT_TYPE_STEP_MS = 88;
const DEFAULT_ERASE_STEP_MS = 52;

export const useRotatingTextWithTypeWriter = (
  values: Ref<string[]>,
  options: UseRotatingTextWithTypeWriterOptions = {},
) => {
  const mode = options.mode ?? "swap";
  const transitionStrategy = options.transitionStrategy ?? "diff";
  const holdMs = options.holdMs ?? DEFAULT_HOLD_MS;
  const swapIntervalMs = options.swapIntervalMs ?? DEFAULT_SWAP_INTERVAL_MS;
  const typeStepMs = options.typeStepMs ?? DEFAULT_TYPE_STEP_MS;
  const eraseStepMs = options.eraseStepMs ?? DEFAULT_ERASE_STEP_MS;
  const loop = options.loop ?? true;

  const displayText = ref("");
  const activeIndex = ref(0);
  const prefersReducedMotion = ref(false);
  const isErasing = ref(false);
  const animationCycle = ref(0);

  const normalizedValues = computed(() =>
    values.value
      .map((value) => value.trim())
      .filter(
        (value, index, source) => value.length > 0 && source.indexOf(value) === index,
      ),
  );
  const normalizedSignature = computed(() => normalizedValues.value.join("\u0001"));

  const pendingTimers: Array<{ id: number; resolve: () => void }> = [];
  let stopLoop = false;
  let mediaQuery: MediaQueryList | null = null;

  const currentValue = computed(() => {
    const candidates = normalizedValues.value;
    if (candidates.length === 0) {
      return "";
    }

    const safeIndex = activeIndex.value % candidates.length;
    return candidates[safeIndex] ?? "";
  });

  const wait = async (delayMs: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        const timerIndex = pendingTimers.findIndex((timer) => timer.id === timeoutId);
        if (timerIndex >= 0) {
          pendingTimers.splice(timerIndex, 1);
        }
        resolve();
      }, delayMs);
      pendingTimers.push({ id: timeoutId, resolve });
    });
  };

  const clearPendingTimers = () => {
    for (const timer of pendingTimers) {
      window.clearTimeout(timer.id);
      timer.resolve();
    }
    pendingTimers.length = 0;
  };

  const updateMotionPreference = () => {
    prefersReducedMotion.value = mediaQuery?.matches ?? false;
  };

  const getCurrentTarget = (): string => {
    const candidates = normalizedValues.value;
    if (candidates.length === 0) {
      return "";
    }
    const safeIndex = activeIndex.value % candidates.length;
    return candidates[safeIndex] ?? "";
  };

  const getCommonPrefixLength = (left: string, right: string): number => {
    const leftChars = Array.from(left);
    const rightChars = Array.from(right);
    const minLength = Math.min(leftChars.length, rightChars.length);

    for (let index = 0; index < minLength; index += 1) {
      if (leftChars[index] !== rightChars[index]) {
        return index;
      }
    }

    return minLength;
  };

  const getDiffRatio = (left: string, right: string): number => {
    const leftLength = Array.from(left).length;
    const rightLength = Array.from(right).length;
    const commonPrefixLength = getCommonPrefixLength(left, right);
    const changedCount =
      leftLength - commonPrefixLength + (rightLength - commonPrefixLength);
    const totalLength = Math.max(leftLength, rightLength, 1);

    return Math.min(1, Math.max(0, changedCount / totalLength));
  };

  const resolveStepDuration = (baseStepMs: number, diffRatio: number): number => {
    const fastScale = 0.62;
    const slowScale = 1.28;
    const scale = slowScale - (slowScale - fastScale) * diffRatio;
    const scaledMs = Math.round(baseStepMs * scale);
    return Math.max(14, scaledMs);
  };

  const eraseToLength = async (
    text: string,
    targetLength: number,
    stepMs: number,
  ): Promise<void> => {
    const chars = Array.from(text);
    if (chars.length <= targetLength) {
      return;
    }

    isErasing.value = true;
    for (let length = chars.length - 1; length >= targetLength && !stopLoop; length -= 1) {
      displayText.value = chars.slice(0, length).join("");
      await wait(stepMs);
    }
  };

  const typeFromLength = async (
    text: string,
    fromLength: number,
    stepMs: number,
  ): Promise<void> => {
    const chars = Array.from(text);
    if (chars.length <= fromLength) {
      displayText.value = chars.join("");
      return;
    }

    isErasing.value = false;
    for (let length = fromLength + 1; length <= chars.length && !stopLoop; length += 1) {
      displayText.value = chars.slice(0, length).join("");
      await wait(stepMs);
    }
  };

  const transitionByDiff = async (from: string, to: string): Promise<void> => {
    const commonPrefixLength = getCommonPrefixLength(from, to);
    const diffRatio = getDiffRatio(from, to);
    const dynamicEraseStepMs = resolveStepDuration(eraseStepMs, diffRatio);
    const dynamicTypeStepMs = resolveStepDuration(typeStepMs, diffRatio);

    await eraseToLength(from, commonPrefixLength, dynamicEraseStepMs);
    isErasing.value = false;

    if (stopLoop) {
      return;
    }

    await typeFromLength(to, commonPrefixLength, dynamicTypeStepMs);
  };

  const transitionByRewrite = async (from: string, to: string): Promise<void> => {
    const diffRatio = getDiffRatio(from, to);
    const dynamicEraseStepMs = resolveStepDuration(eraseStepMs, diffRatio);
    const dynamicTypeStepMs = resolveStepDuration(typeStepMs, diffRatio);

    await eraseToLength(from, 0, dynamicEraseStepMs);
    isErasing.value = false;

    if (stopLoop) {
      return;
    }

    await typeFromLength(to, 0, dynamicTypeStepMs);
  };

  const transitionTypewriter = async (from: string, to: string): Promise<void> => {
    if (transitionStrategy === "diff") {
      await transitionByDiff(from, to);
      return;
    }

    await transitionByRewrite(from, to);
  };

  const runSwapLoop = async () => {
    while (!stopLoop) {
      const candidates = normalizedValues.value;
      if (candidates.length === 0) {
        displayText.value = "";
        await wait(holdMs);
        continue;
      }

      if (prefersReducedMotion.value || candidates.length === 1) {
        isErasing.value = false;
        displayText.value = candidates[0] ?? "";
        await wait(holdMs);
        continue;
      }

      const target = getCurrentTarget();
      isErasing.value = false;
      displayText.value = target;
      await wait(swapIntervalMs);
      activeIndex.value = (activeIndex.value + 1) % candidates.length;
      animationCycle.value += 1;

      if (!loop && activeIndex.value === 0) {
        stopLoop = true;
      }
    }
  };

  const runTypewriterLoop = async () => {
    while (!stopLoop) {
      const candidates = normalizedValues.value;
      if (candidates.length === 0) {
        isErasing.value = false;
        displayText.value = "";
        await wait(holdMs);
        continue;
      }

      if (prefersReducedMotion.value || candidates.length === 1) {
        isErasing.value = false;
        displayText.value = candidates[0] ?? "";
        await wait(holdMs);
        if (!loop) {
          stopLoop = true;
        }
        continue;
      }

      const currentIndex = activeIndex.value % candidates.length;
      const currentTarget = candidates[currentIndex] ?? "";
      const nextIndex = (currentIndex + 1) % candidates.length;
      const nextTarget = candidates[nextIndex] ?? "";

      await transitionTypewriter(displayText.value, currentTarget);

      if (stopLoop) {
        break;
      }

      await wait(holdMs);
      await transitionTypewriter(currentTarget, nextTarget);

      activeIndex.value = nextIndex;
      animationCycle.value += 1;

      if (!loop && activeIndex.value === 0) {
        stopLoop = true;
      }
    }
  };

  const startLoop = async () => {
    stopLoop = false;
    clearPendingTimers();
    activeIndex.value = 0;
    isErasing.value = false;
    animationCycle.value = 0;

    const initialTarget = normalizedValues.value[0] ?? "";
    displayText.value = mode === "typewriter" ? "" : initialTarget;

    if (mode === "typewriter") {
      await runTypewriterLoop();
      return;
    }

    await runSwapLoop();
  };

  watch(normalizedSignature, () => {
    activeIndex.value = 0;
    animationCycle.value = 0;
    isErasing.value = false;
    displayText.value = mode === "typewriter" ? "" : normalizedValues.value[0] ?? "";
  });

  watch(prefersReducedMotion, (isReducedMotion) => {
    isErasing.value = false;
    displayText.value =
      isReducedMotion || mode !== "typewriter"
        ? normalizedValues.value[0] ?? ""
        : "";
  });

  onMounted(() => {
    if (typeof window === "undefined") {
      return;
    }

    mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    updateMotionPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMotionPreference);
    } else {
      mediaQuery.addListener(updateMotionPreference);
    }

    void startLoop();
  });

  onUnmounted(() => {
    stopLoop = true;

    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updateMotionPreference);
      } else {
        mediaQuery.removeListener(updateMotionPreference);
      }
    }

    if (typeof window !== "undefined") {
      clearPendingTimers();
    }
  });

  return {
    displayText,
    currentValue,
    activeIndex,
    prefersReducedMotion,
    isErasing,
    animationCycle,
  };
};
