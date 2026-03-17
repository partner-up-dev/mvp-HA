import { computed, ref, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { AnchorPRDetailView } from "@/domains/pr/model/types";
import { trackEvent } from "@/shared/analytics/track";
import {
  useCheckInAnchorPRSlot,
  useConfirmAnchorPRSlot,
} from "@/domains/pr/queries/useAnchorPR";

type UseAnchorAttendanceActionsOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<AnchorPRDetailView | undefined>;
  onActionSuccess?: () => void;
};

export const useAnchorAttendanceActions = ({
  id,
  pr,
  onActionSuccess,
}: UseAnchorAttendanceActionsOptions) => {
  const { t } = useI18n();
  const confirmSlotMutation = useConfirmAnchorPRSlot();
  const checkInSlotMutation = useCheckInAnchorPRSlot();
  const pendingCheckInDidAttend = ref<boolean | null>(null);

  const hasJoined = computed(
    () => pr.value?.partnerSection.viewer.isParticipant ?? false,
  );

  const canConfirm = computed(() => pr.value?.partnerSection.viewer.canConfirm ?? false);
  const canCheckIn = computed(() => pr.value?.partnerSection.viewer.canCheckIn ?? false);

  const checkInFollowupStatusLabel = computed(() => {
    if (pendingCheckInDidAttend.value === true) {
      return t("prPage.checkInFollowupForAttended");
    }
    return t("prPage.checkInFollowupForMissed");
  });

  const showCheckInFollowup = computed(
    () => hasJoined.value && pendingCheckInDidAttend.value !== null,
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

  const prepareCheckIn = (didAttend: boolean) => {
    pendingCheckInDidAttend.value = didAttend;
  };

  const cancelPendingCheckIn = () => {
    pendingCheckInDidAttend.value = null;
  };

  const submitCheckIn = async (wouldJoinAgain: boolean) => {
    if (id.value === null) return;
    if (pendingCheckInDidAttend.value === null) return;

    await checkInSlotMutation.mutateAsync({
      id: id.value,
      didAttend: pendingCheckInDidAttend.value,
      wouldJoinAgain,
    });

    trackEvent("pr_checkin_submitted", {
      prId: id.value,
      prKind: "ANCHOR",
      scenarioType: pr.value?.core.type,
      didAttend: pendingCheckInDidAttend.value,
      wouldJoinAgain,
    });
    onActionSuccess?.();

    pendingCheckInDidAttend.value = null;
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
