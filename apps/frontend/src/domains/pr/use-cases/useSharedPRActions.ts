import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import { requireWeChatActionAuth } from "@/processes/wechat/requireWeChatActionAuth";
import { trackEvent } from "@/shared/analytics/track";
import { useExitAnchorPR, useJoinAnchorPR } from "@/domains/pr/queries/useAnchorPR";
import {
  useExitCommunityPR,
  useJoinCommunityPR,
} from "@/domains/pr/queries/useCommunityPR";

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

  const getJoinMutation = () =>
    scenario === "ANCHOR" ? anchorJoinMutation : communityJoinMutation;
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

  const canJoin = computed(() => pr.value?.partnerSection.viewer.canJoin ?? false);
  const canExit = computed(() => pr.value?.partnerSection.viewer.canExit ?? false);

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

  const joinPending = computed(() => getJoinMutation().isPending.value);
  const exitPending = computed(() => getExitMutation().isPending.value);

  const ensureActionAuthenticated = async (): Promise<boolean> => {
    return requireWeChatActionAuth(window.location.href);
  };

  const handleJoin = async () => {
    if (id.value === null) return;
    if (scenario === "ANCHOR" && !(await ensureActionAuthenticated())) return;

    const result = await getJoinMutation().mutateAsync({ id: id.value });
    trackEvent("pr_join_success", {
      prId: id.value,
      ...analyticsPRContext.value,
    });
    onActionSuccess?.();
    return result;
  };

  const handleExit = async () => {
    if (id.value === null) return;
    if (scenario === "ANCHOR" && !(await ensureActionAuthenticated())) return;

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
    handleJoin,
    handleExit,
  };

  function resolveSlotStateText(
    slotState: PRDetailView["partnerSection"]["viewer"]["slotState"] | undefined,
  ): string {
    switch (slotState) {
      case "JOINED":
        return t("prPage.slotJoined", { partnerId: shortPartnerId.value });
      case "CONFIRMED":
        return t("prPage.slotConfirmed", { partnerId: shortPartnerId.value });
      case "ATTENDED":
        return t("prPage.slotAttended", { partnerId: shortPartnerId.value });
      default:
        return t("prPage.slotNotJoined");
    }
  }
};
