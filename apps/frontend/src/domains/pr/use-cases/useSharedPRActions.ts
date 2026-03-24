import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import { trackEvent } from "@/shared/analytics/track";
import {
  useExitAnchorPR,
  useJoinAnchorPR,
} from "@/domains/pr/queries/useAnchorPR";
import {
  useExitCommunityPR,
  useJoinCommunityPR,
} from "@/domains/pr/queries/useCommunityPR";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import type { ApiError } from "@/shared/api/error";

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const BOOKING_CONTACT_OWNER_REQUIRED_CODE = "BOOKING_CONTACT_OWNER_REQUIRED";
const BOOKING_CONTACT_REQUIRED_CODE = "BOOKING_CONTACT_REQUIRED";
const WECHAT_PHONE_VERIFY_FAILED_CODE = "WECHAT_PHONE_VERIFY_FAILED";
const WECHAT_AUTH_REQUIRED_CODE = "WECHAT_AUTH_REQUIRED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

type JoinActionOptions = {
  wechatPhoneCredential?: string | null;
};

type UseSharedPRActionsOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
  isCreator: ComputedRef<boolean>;
  scenario: "ANCHOR" | "COMMUNITY";
  onActionSuccess?: () => void;
};

export const useSharedPRActions = ({
  id,
  pr,
  isCreator,
  scenario,
  onActionSuccess,
}: UseSharedPRActionsOptions) => {
  const { t } = useI18n();

  const communityJoinMutation = useJoinCommunityPR();
  const communityExitMutation = useExitCommunityPR();
  const anchorJoinMutation = useJoinAnchorPR();
  const anchorExitMutation = useExitAnchorPR();

  const getExitMutation = () =>
    scenario === "ANCHOR" ? anchorExitMutation : communityExitMutation;

  const hasJoined = computed(
    () => pr.value?.partnerSection.viewer.isParticipant ?? false,
  );
  const analyticsPRContext = computed(() => ({
    prKind: pr.value?.prKind,
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
    scenario === "ANCHOR"
      ? anchorJoinMutation.isPending.value
      : communityJoinMutation.isPending.value,
  );
  const exitPending = computed(() => getExitMutation().isPending.value);
  const joinErrorMessage = computed(() => {
    const error =
      scenario === "ANCHOR"
        ? (anchorJoinMutation.error.value as ApiError | null)
        : (communityJoinMutation.error.value as ApiError | null);
    if (!error) return null;
    if (error.code === JOIN_TIME_WINDOW_CONFLICT_CODE) {
      return t("prPage.partnerSection.blockedTimeWindowConflict");
    }
    if (error.code === BOOKING_CONTACT_OWNER_REQUIRED_CODE) {
      return t("prPage.bookingContact.ownerVerifyBeforeJoin");
    }
    if (error.code === BOOKING_CONTACT_REQUIRED_CODE) {
      return t("prPage.bookingContact.ownerBlockedHint");
    }
    if (error.code === WECHAT_PHONE_VERIFY_FAILED_CODE) {
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
        scenario === "ANCHOR"
          ? await anchorJoinMutation.mutateAsync({
              id: id.value,
              wechatPhoneCredential: options.wechatPhoneCredential ?? null,
            })
          : await communityJoinMutation.mutateAsync({ id: id.value });
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

    const result = await getExitMutation().mutateAsync({ id: id.value });
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
      case "RELEASED":
        return t("prPage.slotReleased");
      default:
        return t("prPage.slotNotJoined");
    }
  }
};
