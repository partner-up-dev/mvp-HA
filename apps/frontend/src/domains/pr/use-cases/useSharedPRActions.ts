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

  const hasJoined = computed(() => pr.value?.core.myPartnerId !== null);
  const analyticsPRContext = computed(() => ({
    prKind: pr.value?.prKind,
    scenarioType: pr.value?.core.type,
  }));

  const shortPartnerId = computed(() => {
    const idValue = pr.value?.core.myPartnerId;
    if (idValue === null || idValue === undefined) return "-";
    return String(idValue);
  });

  const canJoin = computed(() => {
    if (!pr.value) return false;
    if (isCreator.value || hasJoined.value) return false;
    if (pr.value.status !== "OPEN" && pr.value.status !== "READY") return false;

    const currentCount = pr.value.core.partners.length;
    if (
      pr.value.core.maxPartners !== null &&
      currentCount >= pr.value.core.maxPartners
    ) {
      return false;
    }

    return true;
  });

  const showEditContentAction = computed(() => {
    const status = pr.value?.status;
    return Boolean(
      isCreator.value && (status === "OPEN" || status === "DRAFT"),
    );
  });

  const showModifyStatusAction = computed(() => Boolean(isCreator.value));

  const slotStateText = computed(() =>
    hasJoined.value
      ? t("prPage.slotJoined", { partnerId: shortPartnerId.value })
      : t("prPage.slotNotJoined"),
  );

  const joinPending = computed(() => getJoinMutation().isPending.value);
  const exitPending = computed(() => getExitMutation().isPending.value);

  const ensureActionAuthenticated = async (): Promise<boolean> => {
    return requireWeChatActionAuth(window.location.href);
  };

  const handleJoin = async () => {
    if (id.value === null) return;
    if (!(await ensureActionAuthenticated())) return;

    await getJoinMutation().mutateAsync({ id: id.value });
    trackEvent("pr_join_success", {
      prId: id.value,
      ...analyticsPRContext.value,
    });
    onActionSuccess?.();
  };

  const handleExit = async () => {
    if (id.value === null) return;
    if (!(await ensureActionAuthenticated())) return;

    await getExitMutation().mutateAsync({ id: id.value });
    trackEvent("pr_exit_success", {
      prId: id.value,
      ...analyticsPRContext.value,
    });
    onActionSuccess?.();
  };

  return {
    canJoin,
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
};
