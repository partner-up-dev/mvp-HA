import { computed, ref, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { AnchorPRDetailView } from "@/domains/pr/model/types";
import { requireWeChatActionAuth } from "@/processes/wechat/requireWeChatActionAuth";
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

  const hasJoined = computed(() => pr.value?.core.myPartnerId !== null);

  const hasStarted = computed(() => {
    const startRaw = pr.value?.core.time[0];
    if (!startRaw) return false;

    const parsed = new Date(startRaw);
    if (Number.isNaN(parsed.getTime())) return false;

    return Date.now() >= parsed.getTime();
  });

  const canConfirm = computed(() => {
    if (!pr.value || !pr.value.anchor.attendance.supportsConfirm) return false;
    if (!hasJoined.value) return false;
    if (pr.value.status === "EXPIRED" || pr.value.status === "CLOSED") {
      return false;
    }
    return true;
  });

  const checkInFollowupStatusLabel = computed(() => {
    if (pendingCheckInDidAttend.value === true) {
      return t("prPage.checkInFollowupForAttended");
    }
    return t("prPage.checkInFollowupForMissed");
  });

  const showCheckInFollowup = computed(
    () =>
      hasJoined.value &&
      hasStarted.value &&
      pendingCheckInDidAttend.value !== null,
  );

  const confirmPending = computed(() => confirmSlotMutation.isPending.value);
  const checkInPending = computed(() => checkInSlotMutation.isPending.value);

  const ensureActionAuthenticated = async (): Promise<boolean> => {
    return requireWeChatActionAuth(window.location.href);
  };

  const handleConfirmSlot = async () => {
    if (id.value === null) return;
    if (!(await ensureActionAuthenticated())) return;

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
    if (!(await ensureActionAuthenticated())) return;

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
    hasStarted,
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
