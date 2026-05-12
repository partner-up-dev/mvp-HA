import { useUpdateAdminAnchorEvent } from "@/domains/admin/queries/useAdminAnchorEvents";
import {
  type AdminAnchorEventRecord,
  type AnchorEventLocationsDraft,
  buildLocationMeetingPointsInput,
  buildMeetingPointInput,
  normalizeLines,
  toAnchorEventMutationInput,
} from "@/domains/admin/use-cases/anchor-event/anchorEventMutationInput";

export const useUpdateAnchorEventLocations = () => {
  const mutation = useUpdateAdminAnchorEvent();

  const updateLocations = async ({
    event,
    draft,
  }: {
    event: AdminAnchorEventRecord;
    draft: AnchorEventLocationsDraft;
  }) => {
    const locationPool = normalizeLines(draft.locationPoolText);
    return await mutation.mutateAsync({
      eventId: event.id,
      input: toAnchorEventMutationInput(event, {
        locationPool,
        meetingPoint: buildMeetingPointInput(
          draft.meetingPointDescription,
          draft.meetingPointImageUrl,
        ),
        locationMeetingPoints: buildLocationMeetingPointsInput(
          locationPool,
          draft.locationMeetingPoints,
        ),
      }),
    });
  };

  return {
    updateLocations,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};
