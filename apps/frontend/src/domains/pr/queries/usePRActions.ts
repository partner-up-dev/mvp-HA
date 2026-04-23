import type { PRId, PRKind, PRStatusManual } from "@partner-up-dev/backend";
import { computed } from "vue";
import type {
  AnchorPRFormFields,
  CommunityPRFormFields,
} from "@/domains/pr/model/types";
import {
  useCheckInAnchorPRSlot,
  useConfirmAnchorPRSlot,
  useExitAnchorPR,
  useJoinAnchorPR,
  useUpdateAnchorPRContent,
  useUpdateAnchorPRStatus,
} from "./useAnchorPR";
import {
  useExitCommunityPR,
  useJoinCommunityPR,
  useUpdateCommunityPRContent,
  useUpdateCommunityPRStatus,
} from "./useCommunityPR";

type PRScenarioActionInput = {
  id: PRId;
  scenario: PRKind;
};

type PRJoinInput = PRScenarioActionInput & {
  bookingContactPhone?: string | null;
};

type PRUpdateContentInput = PRScenarioActionInput & {
  fields: AnchorPRFormFields | CommunityPRFormFields;
  pin?: string;
};

type PRUpdateStatusInput = PRScenarioActionInput & {
  status: PRStatusManual;
  pin?: string;
};

export const useJoinPR = () => {
  const anchorMutation = useJoinAnchorPR();
  const communityMutation = useJoinCommunityPR();

  return {
    isPending: computed(
      () => anchorMutation.isPending.value || communityMutation.isPending.value,
    ),
    getError: (scenario: PRKind) =>
      scenario === "ANCHOR"
        ? anchorMutation.error.value
        : communityMutation.error.value,
    mutateAsync: async ({ scenario, id, bookingContactPhone }: PRJoinInput) =>
      scenario === "ANCHOR"
        ? anchorMutation.mutateAsync({ id, bookingContactPhone })
        : communityMutation.mutateAsync({ id }),
  };
};

export const useExitPR = () => {
  const anchorMutation = useExitAnchorPR();
  const communityMutation = useExitCommunityPR();

  return {
    isPending: computed(
      () => anchorMutation.isPending.value || communityMutation.isPending.value,
    ),
    mutateAsync: async ({ scenario, id }: PRScenarioActionInput) =>
      scenario === "ANCHOR"
        ? anchorMutation.mutateAsync({ id })
        : communityMutation.mutateAsync({ id }),
  };
};

export const useUpdatePRContent = () => {
  const anchorMutation = useUpdateAnchorPRContent();
  const communityMutation = useUpdateCommunityPRContent();

  return {
    isPending: computed(
      () => anchorMutation.isPending.value || communityMutation.isPending.value,
    ),
    getError: (scenario: PRKind) =>
      scenario === "ANCHOR"
        ? anchorMutation.error.value
        : communityMutation.error.value,
    reset: (scenario: PRKind) => {
      if (scenario === "ANCHOR") {
        anchorMutation.reset();
        return;
      }
      communityMutation.reset();
    },
    mutateAsync: async ({ scenario, id, fields, pin }: PRUpdateContentInput) =>
      scenario === "ANCHOR"
        ? anchorMutation.mutateAsync({
            id,
            fields: fields as AnchorPRFormFields,
            pin,
          })
        : communityMutation.mutateAsync({
            id,
            fields: fields as CommunityPRFormFields,
            pin,
          }),
  };
};

export const useUpdatePRStatus = () => {
  const anchorMutation = useUpdateAnchorPRStatus();
  const communityMutation = useUpdateCommunityPRStatus();

  return {
    isPending: computed(
      () => anchorMutation.isPending.value || communityMutation.isPending.value,
    ),
    getError: (scenario: PRKind) =>
      scenario === "ANCHOR"
        ? anchorMutation.error.value
        : communityMutation.error.value,
    reset: (scenario: PRKind) => {
      if (scenario === "ANCHOR") {
        anchorMutation.reset();
        return;
      }
      communityMutation.reset();
    },
    mutateAsync: async ({ scenario, id, status, pin }: PRUpdateStatusInput) =>
      scenario === "ANCHOR"
        ? anchorMutation.mutateAsync({ id, status, pin })
        : communityMutation.mutateAsync({ id, status, pin }),
  };
};

export const useConfirmPRSlot = () => useConfirmAnchorPRSlot();

export const useCheckInPRSlot = () => useCheckInAnchorPRSlot();
