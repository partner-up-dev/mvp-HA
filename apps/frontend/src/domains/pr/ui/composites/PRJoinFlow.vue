<template>
  <slot
    :open="open"
    :close="closeJoinFlowModal"
    :pending="flowPending"
    :disabled="openDisabled"
    :joined="joined"
    :error-message="joinFlowError"
  />

  <Modal :open="showJoinSubscriptionModal" @close="closeJoinSuccessPrompt">
    <div class="join-success-modal">
      <template v-if="joinSuccessPromptStep === 'SUBSCRIPTIONS'">
        <p class="join-success-modal__text">
          {{ t("prPage.joinSuccessSubscriptions.description") }}
        </p>

        <WeChatNotificationSubscriptionsCard
          :title="t('prPage.notificationSubscriptions.title')"
        >
          <APRNotificationSubscriptions
            :visible-kinds="JOIN_SUCCESS_NOTIFICATION_KINDS"
            :description-prefixes="joinSuccessNotificationDescriptionPrefixes"
            :updating-label="t('prPage.wechatReminder.updating')"
            outline-profile="surface"
          />
        </WeChatNotificationSubscriptionsCard>

        <Button tone="surface" block @click="handleJoinSuccessSubscriptionDone">
          {{ t("prPage.joinSuccessSubscriptions.closeAction") }}
        </Button>
      </template>

      <template v-else>
        <OfficialAccountFollowPanel />
        <div class="join-success-modal__actions">
          <Button
            tone="surface"
            type="button"
            @click="handleCloseJoinOfficialAccountPrompt"
          >
            {{ t("officialAccountFollow.laterAction") }}
          </Button>
          <Button type="button" @click="handleJoinOfficialAccountDone">
            {{ t("officialAccountFollow.doneAction") }}
          </Button>
        </div>
      </template>
    </div>
  </Modal>

  <PRJoinGateModal
    :open="showJoinFlowModal"
    :gates="joinGateItems"
    :loading="joinGatesQuery.isFetching.value"
    :pending="flowPending"
    :error="joinFlowError"
    @close="closeJoinFlowModal"
    @confirm-fallback="handleJoinGateFallbackConfirm"
    @resolve-join-notice="handleResolveJoinNotice"
    @resolve-booking-contact="handleResolveBookingContact"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import WeChatNotificationSubscriptionsCard from "@/shared/ui/sections/WeChatNotificationSubscriptionsCard.vue";
import type { WeChatNotificationKind } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";
import OfficialAccountFollowPanel from "@/domains/marketing/ui/OfficialAccountFollowPanel.vue";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import { useJoinSuccessNotificationPrompt } from "@/domains/notification/use-cases/useJoinSuccessNotificationPrompt";
import { useJoinPR } from "@/domains/pr/queries/usePRActions";
import {
  usePRJoinGates,
  useResolvePRJoinGate,
  type PRJoinGateProjectionItem,
} from "@/domains/pr/queries/usePRJoinGates";
import PRJoinGateModal from "@/domains/pr/ui/modals/PRJoinGateModal.vue";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import type { ApiError } from "@/shared/api/error";
import { trackEvent } from "@/shared/telemetry/track";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type JoinNoticeGate = Extract<
  PRJoinGateProjectionItem,
  { kind: "JOIN_NOTICE" }
>;
type BookingContactGate = Extract<
  PRJoinGateProjectionItem,
  { kind: "BOOKING_CONTACT" }
>;
type JoinSuccessPromptStep = "SUBSCRIPTIONS" | "OFFICIAL_ACCOUNT";

export type PRJoinFlowSlotProps = {
  open: () => Promise<void>;
  close: () => void;
  pending: boolean;
  disabled: boolean;
  joined: boolean;
  errorMessage: string | null;
};

const props = withDefaults(
  defineProps<{
    prId: PRId | null;
    disabled?: boolean;
    scenarioType?: string | null;
    confirmationDeadlineAt?: string | null;
    viewerIsParticipant?: boolean | null;
    showSuccessPrompt?: boolean;
    writeJoinEntryOnAuth?: boolean;
  }>(),
  {
    disabled: false,
    scenarioType: null,
    confirmationDeadlineAt: null,
    viewerIsParticipant: null,
    showSuccessPrompt: true,
    writeJoinEntryOnAuth: false,
  },
);

const emit = defineEmits<{
  joined: [result: unknown];
  "success-closed": [];
  error: [message: string];
}>();

defineSlots<{
  default(props: PRJoinFlowSlotProps): unknown;
}>();

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
const JOIN_SUCCESS_NOTIFICATION_KINDS = [
  "REMINDER_CONFIRMATION",
  "NEW_PARTNER",
  "MEETING_POINT_UPDATED",
] as const satisfies readonly WeChatNotificationKind[];

const prIdRef = computed(() => props.prId);
const showJoinFlowModal = ref(false);
const joinFlowPending = ref(false);
const joinFlowError = ref<string | null>(null);
const joined = ref(false);
const joinSuccessPromptStep = ref<JoinSuccessPromptStep>("SUBSCRIPTIONS");
const successPromptOpenForJoin = ref(false);

const joinMutation = useJoinPR();
const joinGatesQuery = usePRJoinGates(prIdRef, showJoinFlowModal);
const resolveJoinGateMutation = useResolvePRJoinGate();
const {
  isOpen: showJoinSubscriptionModal,
  open: openJoinSuccessNotificationPrompt,
  close: closeJoinSuccessNotificationPrompt,
} = useJoinSuccessNotificationPrompt();
const officialAccountFollowPrompt =
  useOfficialAccountFollowPrompt("pr_join_success");

const joinGateItems = computed<PRJoinGateProjectionItem[]>(
  () => joinGatesQuery.data.value?.gates ?? [],
);
const confirmationDeadlineText = computed(() => {
  const deadline = props.confirmationDeadlineAt?.trim() ?? "";
  if (deadline.length === 0) {
    return null;
  }
  return formatLocalDateTimeValue(deadline) ?? deadline;
});
const joinSuccessNotificationDescriptionPrefixes = computed<
  Partial<Record<WeChatNotificationKind, string>>
>(() => ({
  REMINDER_CONFIRMATION: confirmationDeadlineText.value
    ? t(
        "prPage.joinSuccessSubscriptions.notificationReasons.REMINDER_CONFIRMATION.withDeadline",
        { deadline: confirmationDeadlineText.value },
      )
    : t(
        "prPage.joinSuccessSubscriptions.notificationReasons.REMINDER_CONFIRMATION.fallback",
      ),
  NEW_PARTNER: t(
    "prPage.joinSuccessSubscriptions.notificationReasons.NEW_PARTNER",
  ),
  MEETING_POINT_UPDATED: t(
    "prPage.joinSuccessSubscriptions.notificationReasons.MEETING_POINT_UPDATED",
  ),
}));
const flowPending = computed(
  () =>
    joinFlowPending.value ||
    joinMutation.isPending.value ||
    resolveJoinGateMutation.isPending.value ||
    joinGatesQuery.isFetching.value,
);
const openDisabled = computed(
  () => props.disabled || props.prId === null || joined.value,
);

useBodyScrollLock(
  computed(
    () => showJoinSubscriptionModal.value || showJoinFlowModal.value,
  ),
);

const readAuthPayload = (result: unknown): AuthSessionPayload | null => {
  if (typeof result !== "object" || result === null) {
    return null;
  }
  return (result as { auth?: AuthSessionPayload | null }).auth ?? null;
};

const applyAuthPayloadFromResult = async (result: unknown): Promise<void> => {
  const authPayload = readAuthPayload(result);
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }
  if (authPayload?.userPin && props.writeJoinEntryOnAuth) {
    await router.replace({ query: { ...route.query, entry: "join" } });
  }
};

const hasUnresolvedCustomJoinGate = (
  gates: PRJoinGateProjectionItem[],
): boolean =>
  gates.some((gate) => gate.kind !== "FALLBACK_CONFIRM" && !gate.resolved);

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : t("common.operationFailed");

const emitFlowError = (message: string): void => {
  joinFlowError.value = message;
  emit("error", message);
};

const closeJoinFlowModal = (): void => {
  showJoinFlowModal.value = false;
  joinFlowPending.value = false;
  joinFlowError.value = null;
  resolveJoinGateMutation.reset();
};

const finishSuccessPrompt = (): void => {
  joinSuccessPromptStep.value = "SUBSCRIPTIONS";
  closeJoinSuccessNotificationPrompt();
  if (successPromptOpenForJoin.value) {
    successPromptOpenForJoin.value = false;
    emit("success-closed");
  }
};

const closeJoinSuccessPrompt = (): void => {
  if (joinSuccessPromptStep.value === "OFFICIAL_ACCOUNT") {
    officialAccountFollowPrompt.dismissPrompt();
  }
  finishSuccessPrompt();
};

const handleJoinSuccessSubscriptionDone = (): void => {
  if (officialAccountFollowPrompt.canPromptNow()) {
    officialAccountFollowPrompt.markPromptPresented();
    joinSuccessPromptStep.value = "OFFICIAL_ACCOUNT";
    return;
  }
  finishSuccessPrompt();
};

const handleCloseJoinOfficialAccountPrompt = (): void => {
  officialAccountFollowPrompt.dismissPrompt();
  finishSuccessPrompt();
};

const handleJoinOfficialAccountDone = (): void => {
  officialAccountFollowPrompt.markPromptCompleted();
  finishSuccessPrompt();
};

const openSuccessPrompt = (): void => {
  if (!props.showSuccessPrompt) {
    emit("success-closed");
    return;
  }
  successPromptOpenForJoin.value = true;
  joinSuccessPromptStep.value = "SUBSCRIPTIONS";
  openJoinSuccessNotificationPrompt();
};

const finalizeJoinFlow = async (): Promise<void> => {
  const prId = props.prId;
  if (prId === null || joinFlowPending.value || joinMutation.isPending.value) {
    return;
  }

  joinFlowPending.value = true;
  joinFlowError.value = null;
  try {
    await ensureAuthSessionBootstrapped();
    const result = await joinMutation.mutateAsync({ id: prId });
    await applyAuthPayloadFromResult(result);
    joined.value = true;
    trackEvent("pr_join_success", {
      prId,
      scenarioType: props.scenarioType ?? undefined,
    });
    emit("joined", result);
    closeJoinFlowModal();
    openSuccessPrompt();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === PR_JOIN_GATE_UNRESOLVED_CODE) {
      showJoinFlowModal.value = true;
      await joinGatesQuery.refetch();
      return;
    }
    emitFlowError(resolveErrorMessage(error));
  } finally {
    joinFlowPending.value = false;
  }
};

const refreshJoinGatesForModal = async (): Promise<void> => {
  const result = await joinGatesQuery.refetch();
  if (!showJoinFlowModal.value) return;
  if (result.error) {
    emitFlowError(resolveErrorMessage(result.error));
    return;
  }

  const gates = result.data?.gates ?? [];
  const hasFallbackConfirm = gates.some(
    (gate) => gate.kind === "FALLBACK_CONFIRM",
  );
  if (
    gates.length > 0 &&
    !hasFallbackConfirm &&
    !hasUnresolvedCustomJoinGate(gates)
  ) {
    await finalizeJoinFlow();
  }
};

const open = async (): Promise<void> => {
  if (openDisabled.value || flowPending.value) return;
  joinFlowError.value = null;
  showJoinFlowModal.value = true;
  await nextTick();
  await refreshJoinGatesForModal();
};

const continueAfterGateResolution = async (
  gates: PRJoinGateProjectionItem[],
): Promise<void> => {
  if (hasUnresolvedCustomJoinGate(gates)) {
    joinFlowError.value = null;
    return;
  }
  await finalizeJoinFlow();
};

const handleResolveJoinNotice = async (gate: JoinNoticeGate): Promise<void> => {
  const prId = props.prId;
  if (prId === null || flowPending.value) return;
  joinFlowError.value = null;
  try {
    const result = await resolveJoinGateMutation.mutateAsync({
      id: prId,
      gateKey: gate.key,
      payload: {
        kind: "JOIN_NOTICE",
        version: gate.version,
        accepted: true,
      },
    });
    await applyAuthPayloadFromResult(result);
    await continueAfterGateResolution(result.gates);
  } catch (error) {
    emitFlowError(resolveErrorMessage(error));
  }
};

const handleResolveBookingContact = async (payload: {
  gate: BookingContactGate;
  phone: string;
}): Promise<void> => {
  const prId = props.prId;
  if (prId === null || flowPending.value) return;
  joinFlowError.value = null;
  try {
    const result = await resolveJoinGateMutation.mutateAsync({
      id: prId,
      gateKey: payload.gate.key,
      payload: {
        kind: "BOOKING_CONTACT",
        version: payload.gate.version,
        phone: payload.phone,
      },
    });
    await applyAuthPayloadFromResult(result);
    await continueAfterGateResolution(result.gates);
  } catch (error) {
    emitFlowError(resolveErrorMessage(error));
  }
};

const handleJoinGateFallbackConfirm = async (): Promise<void> => {
  await finalizeJoinFlow();
};

watch(
  () => props.prId,
  () => {
    joined.value = false;
    closeJoinFlowModal();
    finishSuccessPrompt();
  },
);

watch(
  () => props.viewerIsParticipant,
  (isParticipant) => {
    if (isParticipant === false) {
      joined.value = false;
    }
  },
);

defineExpose({
  open,
  close: closeJoinFlowModal,
});
</script>

<style lang="scss" scoped>
.join-success-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.join-success-modal__text {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.join-success-modal__actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.join-success-modal__actions > button {
  flex: 1 1 180px;
}
</style>
