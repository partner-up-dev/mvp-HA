import { onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { PRId } from "@partner-up-dev/backend";

type UsePRLivePollingOptions = {
  id: Ref<PRId | null>;
  refetch: () => Promise<unknown>;
  intervalMs?: number;
  maxAttempts?: number;
};

export const usePRLivePolling = ({
  id,
  refetch,
  intervalMs = 2_000,
  maxAttempts = 10,
}: UsePRLivePollingOptions) => {
  const livePollAttemptCount = ref(0);
  const livePollTimerId = ref<number | null>(null);
  const livePollInFlight = ref(false);

  const stopLivePolling = () => {
    if (typeof window === "undefined") return;
    if (livePollTimerId.value !== null) {
      window.clearInterval(livePollTimerId.value);
      livePollTimerId.value = null;
    }
  };

  const tickLivePolling = async () => {
    if (id.value === null) return stopLivePolling();
    if (livePollAttemptCount.value >= maxAttempts) {
      return stopLivePolling();
    }
    if (livePollInFlight.value) return;

    livePollAttemptCount.value += 1;
    livePollInFlight.value = true;
    try {
      await refetch();
    } finally {
      livePollInFlight.value = false;
      if (livePollAttemptCount.value >= maxAttempts) {
        stopLivePolling();
      }
    }
  };

  const startLivePolling = () => {
    if (typeof window === "undefined") return;
    if (id.value === null || livePollTimerId.value !== null) return;
    livePollTimerId.value = window.setInterval(() => {
      void tickLivePolling();
    }, intervalMs);
  };

  const resetLivePolling = () => {
    livePollAttemptCount.value = 0;
    if (id.value === null) return stopLivePolling();
    if (livePollTimerId.value === null) startLivePolling();
  };

  watch(
    id,
    (nextId) => {
      stopLivePolling();
      livePollAttemptCount.value = 0;
      livePollInFlight.value = false;
      if (nextId !== null) startLivePolling();
    },
    { immediate: true },
  );

  onBeforeUnmount(stopLivePolling);

  return {
    resetLivePolling,
  };
};
