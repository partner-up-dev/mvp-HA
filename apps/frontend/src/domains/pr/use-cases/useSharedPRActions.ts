import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import {
  resolvePRScenario,
  type PRDetailView,
} from "@/domains/pr/model/types";
import { trackEvent } from "@/shared/telemetry/track";
import { useExitPR, useJoinPR } from "@/domains/pr/queries/usePRActions";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import type { ApiError } from "@/shared/api/error";

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const BOOKING_CONTACT_PHONE_REQUIRED_CODE = "BOOKING_CONTACT_PHONE_REQUIRED";
const BOOKING_CONTACT_PHONE_INVALID_CODE = "BOOKING_CONTACT_PHONE_INVALID";
const WECHAT_AUTH_REQUIRED_CODE = "WECHAT_AUTH_REQUIRED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

type JoinActionOptions = {
  bookingContactPhone?: string | null;
};

type UseSharedPRActionsOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
  isCreator: ComputedRef<boolean>;
  onActionSuccess?: () => void;
};

export const useSharedPRActions = ({
  id,
  pr,
  isCreator,
  onActionSuccess,
}: UseSharedPRActionsOptions) => {
  const { t } = useI18n();

  const joinMutation = useJoinPR();
  const exitMutation = useExitPR();
  const scenario = computed(() => resolvePRScenario(pr.value));

  const hasJoined = computed(
    () => pr.value?.partnerSection.viewer.isParticipant ?? false,
  );
  const analyticsPRContext = computed(() => ({
    scenarioType: pr.value?.core.type,
  }));

  const shortPartnerId = computed(() => {
    const idValue = pr.value?.core.myPartnerId;
    if (idValue === null || idValue === undefined) return "-";
    return String(idValue);
  });

  const canJoin = computed(
    () => pr.value?.partnerSection.viewer.canJoin ?? false,
  );
  const canExit = computed(
    () => pr.value?.partnerSection.viewer.canExit ?? false,
  );

  const showEditContentAction = computed(() => {
    const status = pr.value?.status;
    return Boolean(
      isCreator.value && (status === "OPEN" || status === "DRAFT"),
    );
  });

  const showModifyStatusAction = computed(() => Boolean(isCreator.value));

  const slotStateText = computed(() =>
    resolveSlotStateText(pr.value?.partnerSection.viewer.slotState),
  );

  const joinPending = computed(() =>
    joinMutation.isPending.value,
  );
  const exitPending = computed(() => exitMutation.isPending.value);
  const joinErrorMessage = computed(() => {
    const error = joinMutation.getError(scenario.value) as ApiError | null;
    if (!error) return null;
    if (error.code === JOIN_TIME_WINDOW_CONFLICT_CODE) {
      return t("prPage.partnerSection.blockedTimeWindowConflict");
    }
    if (error.code === BOOKING_CONTACT_PHONE_REQUIRED_CODE) {
      return t("prPage.bookingContact.ownerVerifyBeforeJoin");
    }
    if (error.code === BOOKING_CONTACT_PHONE_INVALID_CODE) {
      return t("prPage.bookingContact.verifyFailed");
    }
    if (
      error.code === WECHAT_AUTH_REQUIRED_CODE ||
      error.code === WECHAT_BIND_REQUIRED_CODE
    ) {
      return t("prPage.wechatLoginRequired");
    }
    return null;
  });

  const handleJoin = async (options: JoinActionOptions = {}) => {
    if (id.value === null) return;

    try {
      await ensureAuthSessionBootstrapped();
      const result =
        await joinMutation.mutateAsync({
          scenario: scenario.value,
          id: id.value,
          bookingContactPhone: options.bookingContactPhone ?? null,
        });
      trackEvent("pr_join_success", {
        prId: id.value,
        ...analyticsPRContext.value,
      });
      onActionSuccess?.();
      return result;
    } catch {
      return null;
    }
  };

  const handleExit = async () => {
    if (id.value === null) return;

    const result = await exitMutation.mutateAsync({
      scenario: scenario.value,
      id: id.value,
    });
    trackEvent("pr_exit_success", {
      prId: id.value,
      ...analyticsPRContext.value,
    });
    onActionSuccess?.();
    return result;
  };

  return {
    canJoin,
    canExit,
    hasJoined,
    shortPartnerId,
    slotStateText,
    showEditContentAction,
    showModifyStatusAction,
    joinPending,
    exitPending,
    joinErrorMessage,
    handleJoin,
    handleExit,
  };

  function resolveSlotStateText(
    slotState:
      | PRDetailView["partnerSection"]["viewer"]["slotState"]
      | undefined,
  ): string {
    switch (slotState) {
      case "JOINED":
        return t("prPage.slotJoined", { partnerId: shortPartnerId.value });
      case "CONFIRMED":
        return t("prPage.slotConfirmed", { partnerId: shortPartnerId.value });
      case "ATTENDED":
        return t("prPage.slotAttended", { partnerId: shortPartnerId.value });
      case "EXITED":
        return t("prPage.slotExited");
      case "RELEASED":
        return t("prPage.slotReleased");
      default:
        return t("prPage.slotNotJoined");
    }
  }
};
