import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useUserPRStore = defineStore(
  "userPR",
  () => {
    // State
    const creatorOf = ref<string[]>([]);
    const participantsOf = ref<string[]>([]);

    // Getters
    const isCreatorOf = computed(() => (prId: string) => {
      return creatorOf.value.includes(prId);
    });

    const isParticipantOf = computed(() => (prId: string) => {
      return participantsOf.value.includes(prId);
    });

    const createdPRs = computed(() => creatorOf.value);
    const joinedPRs = computed(() => participantsOf.value);

    // Actions
    function addCreatedPR(prId: string) {
      if (!creatorOf.value.includes(prId)) {
        creatorOf.value.push(prId);
      }
    }

    function joinPR(prId: string) {
      if (!participantsOf.value.includes(prId)) {
        participantsOf.value.push(prId);
      }
    }

    function exitPR(prId: string) {
      const index = participantsOf.value.indexOf(prId);
      if (index > -1) {
        participantsOf.value.splice(index, 1);
      }
    }

    function removeCreatedPR(prId: string) {
      const index = creatorOf.value.indexOf(prId);
      if (index > -1) {
        creatorOf.value.splice(index, 1);
      }
    }

    function reset() {
      creatorOf.value = [];
      participantsOf.value = [];
    }

    return {
      // State
      creatorOf,
      participantsOf,
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
      reset,
    };
  },
  {
    persist: {
      storage: localStorage,
      pick: ["creatorOf", "participantsOf"],
    },
  },
);
