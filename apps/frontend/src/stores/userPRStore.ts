import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { PRId } from "@partner-up-dev/backend";

export const useUserPRStore = defineStore(
  "userPR",
  () => {
    // State
    const creatorOf = ref<PRId[]>([]);
    const participantsOf = ref<PRId[]>([]);
    const prPIN = ref<Record<string, string>>({});

    // Getters
    const isCreatorOf = computed(() => (prId: PRId) => {
      return creatorOf.value.includes(prId);
    });

    const isParticipantOf = computed(() => (prId: PRId) => {
      return participantsOf.value.includes(prId);
    });

    const createdPRs = computed(() => creatorOf.value);
    const joinedPRs = computed(() => participantsOf.value);

    const normalizePRKey = (prId: PRId) => String(prId);

    // Actions
    function addCreatedPR(prId: PRId) {
      if (!creatorOf.value.includes(prId)) {
        creatorOf.value.push(prId);
      }
    }

    function joinPR(prId: PRId) {
      if (!participantsOf.value.includes(prId)) {
        participantsOf.value.push(prId);
      }
    }

    function exitPR(prId: PRId) {
      const index = participantsOf.value.indexOf(prId);
      if (index > -1) {
        participantsOf.value.splice(index, 1);
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
      participantsOf.value = [];
      prPIN.value = {};
    }

    return {
      // State
      creatorOf,
      participantsOf,
      prPIN,
      // Getters
      isCreatorOf,
      isParticipantOf,
      createdPRs,
      joinedPRs,
      // Actions
      addCreatedPR,
      joinPR,
      exitPR,
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
      pick: ["creatorOf", "participantsOf", "prPIN"],
    },
  },
);
