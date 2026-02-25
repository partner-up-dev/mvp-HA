import { computed, ref, type ComputedRef } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import { useI18n } from "vue-i18n";
import { useJoinPR } from "@/queries/useJoinPR";
import { useExitPR } from "@/queries/useExitPR";
import { useConfirmPRSlot } from "@/queries/useConfirmPRSlot";
import { useCheckInPRSlot } from "@/queries/useCheckInPRSlot";
import type { PRDetailView } from "@/entities/pr/types";
import {
  fetchOAuthSession,
  redirectToWeChatOAuthLogin,
} from "@/composables/useAutoWeChatLogin";

type UsePRActionsOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
  isCreator: ComputedRef<boolean>;
};

export const usePRActions = ({ id, pr, isCreator }: UsePRActionsOptions) => {
  const { t } = useI18n();

  const joinMutation = useJoinPR();
  const exitMutation = useExitPR();
  const confirmSlotMutation = useConfirmPRSlot();
  const checkInSlotMutation = useCheckInPRSlot();

  const pendingCheckInDidAttend = ref<boolean | null>(null);

  const hasJoined = computed(() => pr.value?.myPartnerId !== null);

  const shortPartnerId = computed(() => {
    const idValue = pr.value?.myPartnerId;
    if (idValue === null || idValue === undefined) return "-";
    return String(idValue);
  });

  const canJoin = computed(() => {
    if (!pr.value) return false;
    if (isCreator.value || hasJoined.value) return false;
    if (pr.value.status !== "OPEN" && pr.value.status !== "READY") return false;

    const currentCount = pr.value.partners.length;
    if (pr.value.maxPartners !== null && currentCount >= pr.value.maxPartners) {
      return false;
    }

    return true;
  });

  const hasStarted = computed(() => {
    const startRaw = pr.value?.time[0];
    if (!startRaw) return false;

    const parsed = new Date(startRaw);
    if (Number.isNaN(parsed.getTime())) return false;

    return Date.now() >= parsed.getTime();
  });

  const canConfirm = computed(() => {
    if (!pr.value) return false;
    if (!hasJoined.value) return false;
    if (pr.value.status === "EXPIRED" || pr.value.status === "CLOSED") {
      return false;
    }
    return true;
  });

  const showEditContentAction = computed(() => {
    const status = pr.value?.status;
    return Boolean(isCreator.value && (status === "OPEN" || status === "DRAFT"));
  });

  const showModifyStatusAction = computed(() => Boolean(isCreator.value));

  const slotStateText = computed(() =>
    hasJoined.value
      ? t("prPage.slotJoined", { partnerId: shortPartnerId.value })
      : t("prPage.slotNotJoined"),
  );

  const checkInFollowupStatusLabel = computed(() => {
    if (pendingCheckInDidAttend.value === true) {
      return t("prPage.checkInFollowupForAttended");
    }
    return t("prPage.checkInFollowupForMissed");
  });

  const showCheckInFollowup = computed(
    () => hasJoined.value && hasStarted.value && pendingCheckInDidAttend.value !== null,
  );

  const joinPending = computed(() => joinMutation.isPending.value);
  const exitPending = computed(() => exitMutation.isPending.value);
  const confirmPending = computed(() => confirmSlotMutation.isPending.value);
  const checkInPending = computed(() => checkInSlotMutation.isPending.value);

  const ensureActionAuthenticated = async (): Promise<boolean> => {
    const session = await fetchOAuthSession();
    if (session?.configured && !session.authenticated) {
      redirectToWeChatOAuthLogin(window.location.href);
      return false;
    }
    return true;
  };

  const handleJoin = async () => {
    if (id.value === null) return;
    if (!(await ensureActionAuthenticated())) return;

    await joinMutation.mutateAsync({ id: id.value });
  };

  const handleExit = async () => {
    if (id.value === null) return;
    if (!(await ensureActionAuthenticated())) return;

    await exitMutation.mutateAsync({ id: id.value });
  };

  const handleConfirmSlot = async () => {
    if (id.value === null) return;
    if (!(await ensureActionAuthenticated())) return;

    await confirmSlotMutation.mutateAsync({ id: id.value });
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

    pendingCheckInDidAttend.value = null;
  };

  return {
    canJoin,
    canConfirm,
    hasJoined,
    hasStarted,
    shortPartnerId,
    slotStateText,
    showEditContentAction,
    showModifyStatusAction,
    showCheckInFollowup,
    checkInFollowupStatusLabel,
    joinPending,
    exitPending,
    confirmPending,
    checkInPending,
    handleJoin,
    handleExit,
    handleConfirmSlot,
    prepareCheckIn,
    cancelPendingCheckIn,
    submitCheckIn,
  };
};

