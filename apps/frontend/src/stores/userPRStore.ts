import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { PRId } from "@partner-up-dev/backend";

export const useUserPRStore = defineStore(
  "userPR",
  () => {
    const creatorOf = ref<PRId[]>([]);
    const prPIN = ref<Record<string, string>>({});

    const isCreatorOf = computed(() => (prId: PRId) => {
      return creatorOf.value.includes(prId);
    });

    const createdPRs = computed(() => creatorOf.value);
    const normalizePRKey = (prId: PRId) => String(prId);

    function addCreatedPR(prId: PRId) {
      if (!creatorOf.value.includes(prId)) {
        creatorOf.value.push(prId);
      }
    }

    function removeCreatedPR(prId: PRId) {
      const index = creatorOf.value.indexOf(prId);
      if (index > -1) {
        creatorOf.value.splice(index, 1);
      }
    }

    function setPRPin(prId: PRId, pin: string) {
      prPIN.value[normalizePRKey(prId)] = pin;
    }

    function getPRPin(prId: PRId) {
      return prPIN.value[normalizePRKey(prId)] ?? null;
    }

    function clearPRPin(prId: PRId) {
      delete prPIN.value[normalizePRKey(prId)];
    }

    function reset() {
      creatorOf.value = [];
      prPIN.value = {};
    }

    return {
      creatorOf,
      prPIN,
      isCreatorOf,
      createdPRs,
      addCreatedPR,
      removeCreatedPR,
      setPRPin,
      getPRPin,
      clearPRPin,
      reset,
    };
  },
  {
    persist: {
      storage: localStorage,
      pick: ["creatorOf", "prPIN"],
    },
  },
);
