import { computed, ref, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { AnchorPRDetailView } from "@/domains/pr/model/types";
import { trackEvent } from "@/shared/telemetry/track";
import { useCheckInPRSlot, useConfirmPRSlot } from "@/domains/pr/queries/usePRActions";

export type UsePRAttendanceActionsOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<AnchorPRDetailView | undefined>;
  onActionSuccess?: () => void;
};

export const usePRAttendanceActions = ({
  id,
  pr,
  onActionSuccess,
}: UsePRAttendanceActionsOptions) => {
  const { t } = useI18n();
  const confirmSlotMutation = useConfirmPRSlot();
  const checkInSlotMutation = useCheckInPRSlot();
  const checkInFollowupOpen = ref(false);

  const hasJoined = computed(
    () => pr.value?.partnerSection.viewer.isParticipant ?? false,
  );

  const canConfirm = computed(() => pr.value?.partnerSection.viewer.canConfirm ?? false);
  const canCheckIn = computed(() => pr.value?.partnerSection.viewer.canCheckIn ?? false);

  const checkInFollowupStatusLabel = computed(
    () => t("prPage.checkInFollowupForAttended"),
  );

  const showCheckInFollowup = computed(
    () => hasJoined.value && checkInFollowupOpen.value,
  );

  const confirmPending = computed(() => confirmSlotMutation.isPending.value);
  const checkInPending = computed(() => checkInSlotMutation.isPending.value);

  const handleConfirmSlot = async () => {
    if (id.value === null) return;

    await confirmSlotMutation.mutateAsync({ id: id.value });
    trackEvent("pr_confirm_success", {
      prId: id.value,
      prKind: "ANCHOR",
      scenarioType: pr.value?.core.type,
    });
    onActionSuccess?.();
  };

  const prepareCheckIn = () => {
    checkInFollowupOpen.value = true;
  };

  const cancelPendingCheckIn = () => {
    checkInFollowupOpen.value = false;
  };

  const submitCheckIn = async (wouldJoinAgain: boolean) => {
    if (id.value === null) return;
    if (!checkInFollowupOpen.value) return;

    await checkInSlotMutation.mutateAsync({
      id: id.value,
      wouldJoinAgain,
    });

    trackEvent("pr_checkin_submitted", {
      prId: id.value,
      prKind: "ANCHOR",
      scenarioType: pr.value?.core.type,
      didAttend: true,
      wouldJoinAgain,
    });
    onActionSuccess?.();

    checkInFollowupOpen.value = false;
  };

  return {
    canConfirm,
    canCheckIn,
    showCheckInFollowup,
    checkInFollowupStatusLabel,
    confirmPending,
    checkInPending,
    handleConfirmSlot,
    prepareCheckIn,
    cancelPendingCheckIn,
    submitCheckIn,
  };
};
