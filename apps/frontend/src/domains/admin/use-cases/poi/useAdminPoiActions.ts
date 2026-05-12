import {
  type AdminPoiAvailabilityRulesInput,
  usePublishAdminPoi,
  useRejectAdminPoi,
  useUpsertAdminPoi,
} from "@/domains/admin/queries/useAdminPoiManagement";

type MeetingPointInput = {
  description: string | null;
  imageUrl: string | null;
};

export type AdminPoiUpsertInput = {
  poiId: string;
  gallery: string[];
  perTimeWindowCap: number | null;
  availabilityRules: AdminPoiAvailabilityRulesInput;
  meetingPoint?: MeetingPointInput | null;
};

export const useAdminPoiActions = () => {
  const upsertPoiMutation = useUpsertAdminPoi();
  const publishPoiMutation = usePublishAdminPoi();
  const rejectPoiMutation = useRejectAdminPoi();

  const upsertPoi = async (input: AdminPoiUpsertInput) =>
    await upsertPoiMutation.mutateAsync(input);

  const publishPoi = async (poiId: string) =>
    await publishPoiMutation.mutateAsync({ poiId });

  const rejectPoi = async ({
    poiId,
    rejectReason,
  }: {
    poiId: string;
    rejectReason: string | null;
  }) =>
    await rejectPoiMutation.mutateAsync({
      poiId,
      rejectReason,
    });

  const reset = () => {
    upsertPoiMutation.reset();
    publishPoiMutation.reset();
    rejectPoiMutation.reset();
  };

  return {
    upsertPoi,
    publishPoi,
    rejectPoi,
    isPending: {
      upsert: upsertPoiMutation.isPending,
      publish: publishPoiMutation.isPending,
      reject: rejectPoiMutation.isPending,
    },
    errors: {
      upsert: upsertPoiMutation.error,
      publish: publishPoiMutation.error,
      reject: rejectPoiMutation.error,
    },
    reset,
  };
};
