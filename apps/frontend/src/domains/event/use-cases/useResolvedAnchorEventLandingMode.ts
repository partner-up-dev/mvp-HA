import { computed, watch, type Ref } from "vue";
import {
  readStoredAnchorEventLandingMode,
  writeStoredAnchorEventLandingMode,
  type AnchorEventLandingMode,
} from "@/domains/event/model/anchorEventLandingModeStorage";
import {
  isAnchorEventLandingAssignmentTimeoutError,
  useAnchorEventLandingAssignment,
} from "@/domains/event/queries/useAnchorEventLandingAssignment";

export const useResolvedAnchorEventLandingMode = (
  eventId: Ref<number | null>,
) => {
  const assignmentQuery = useAnchorEventLandingAssignment(eventId);

  const resolvedMode = computed<AnchorEventLandingMode | null>(() => {
    const assignment = assignmentQuery.data.value;
    const resolvedEventId = eventId.value;

    if (assignment && resolvedEventId !== null) {
      return (
        readStoredAnchorEventLandingMode(
          resolvedEventId,
          assignment.assignmentRevision,
        ) ?? assignment.mode
      );
    }

    if (isAnchorEventLandingAssignmentTimeoutError(assignmentQuery.error.value)) {
      return "FORM";
    }

    return null;
  });

  watch(
    [eventId, () => assignmentQuery.data.value],
    ([resolvedEventId, assignment]) => {
      if (resolvedEventId === null || !assignment) {
        return;
      }

      const storedMode = readStoredAnchorEventLandingMode(
        resolvedEventId,
        assignment.assignmentRevision,
      );
      if (storedMode !== null) {
        return;
      }

      writeStoredAnchorEventLandingMode(
        resolvedEventId,
        assignment.assignmentRevision,
        assignment.mode,
      );
    },
    { immediate: true },
  );

  return {
    assignmentQuery,
    resolvedMode,
    isTimeoutFallback: computed(() =>
      isAnchorEventLandingAssignmentTimeoutError(assignmentQuery.error.value),
    ),
  };
};
