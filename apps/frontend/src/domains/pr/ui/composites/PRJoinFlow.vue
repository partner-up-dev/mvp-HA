<template>
  <slot
    :open="open"
    :close="closeJoinFlowModal"
    :pending="flowPending"
    :disabled="openDisabled"
    :joined="joined"
    :error-message="joinFlowError"
  />

  <Modal
    :open="showJoinFlowModal"
    max-width="420px"
    title="加入活动"
    @close="closeJoinFlowModal"
  >
    <PRJoinGates
      :pr-id="props.prId"
      :enabled="showJoinFlowModal"
      :pending="flowPending"
      :error="joinFlowError"
      :fallback-confirm-gate="PRJoinFallbackConfirmGate"
      @cancel="closeJoinFlowModal"
      @completed="finalizeJoinFlow"
      @error="emitFlowError"
      @resolved="applyAuthPayloadFromResult"
    />
  </Modal>

  <Modal :open="showJoinSubscriptionModal" @close="closeJoinSuccessPrompt">
    <div class="join-success-modal">
      <template v-if="joinSuccessPromptStep === 'SUBSCRIPTIONS'">
        <section
          class="join-success-modal__subscriptions"
          data-testid="pr-detail.join-success.subscriptions"
          aria-labelledby="join-success-subscriptions-title"
        >
          <div class="join-success-modal__subscriptions-heading">
            <h2
              id="join-success-subscriptions-title"
              class="join-success-modal__subscriptions-title"
            >
              {{ t("prPage.notificationSubscriptions.title") }}
            </h2>
            <p class="join-success-modal__subscriptions-description">
              {{ t("prPage.joinSuccessSubscriptions.description") }}
            </p>
          </div>

          <APRNotificationSubscriptions
            :visible-kinds="JOIN_SUCCESS_NOTIFICATION_KINDS"
            :description-prefixes="joinSuccessNotificationDescriptionPrefixes"
            :updating-label="t('prPage.wechatReminder.updating')"
            outline-profile="surface"
          />
        </section>

        <Button
          tone="surface"
          block
          data-testid="pr-detail.join-success.done"
          @click="handleJoinSuccessSubscriptionDone"
        >
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
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import type { WeChatNotificationKind } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";
import OfficialAccountFollowPanel from "@/domains/marketing/ui/OfficialAccountFollowPanel.vue";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import { useJoinSuccessNotificationPrompt } from "@/domains/notification/use-cases/useJoinSuccessNotificationPrompt";
import { useJoinPR } from "@/domains/pr/queries/usePRActions";
import PRJoinGates from "@/domains/pr/ui/composites/PRJoinGates.vue";
import PRJoinFallbackConfirmGate from "@/domains/pr/ui/gates/PRJoinFallbackConfirmGate.vue";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import type { ApiError } from "@/shared/api/error";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type JoinSuccessPromptStep = "SUBSCRIPTIONS" | "OFFICIAL_ACCOUNT";
type PRJoinEntrySurface =
  | "pr_detail"
  | "form_mode_matched"
  | "form_mode_candidate";

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
    eventId?: number | null;
    entrySurface?: PRJoinEntrySurface | null;
    candidateRank?: number | null;
  }>(),
  {
    disabled: false,
    scenarioType: null,
    confirmationDeadlineAt: null,
    viewerIsParticipant: null,
    showSuccessPrompt: true,
    writeJoinEntryOnAuth: false,
    eventId: null,
    entrySurface: null,
    candidateRank: null,
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

const showJoinFlowModal = ref(false);
const joinFlowPending = ref(false);
const joinFlowError = ref<string | null>(null);
const joined = ref(false);
const joinSuccessPromptStep = ref<JoinSuccessPromptStep>("SUBSCRIPTIONS");
const successPromptOpenForJoin = ref(false);

const joinMutation = useJoinPR();
const {
  isOpen: showJoinSubscriptionModal,
  open: openJoinSuccessNotificationPrompt,
  close: closeJoinSuccessNotificationPrompt,
} = useJoinSuccessNotificationPrompt();
const officialAccountFollowPrompt =
  useOfficialAccountFollowPrompt("pr_join_result");

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
  () => joinFlowPending.value || joinMutation.isPending.value,
);
const openDisabled = computed(
  () => props.disabled || props.prId === null || joined.value,
);

useBodyScrollLock(
  computed(() => showJoinSubscriptionModal.value || showJoinFlowModal.value),
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
  if (authPayload && props.writeJoinEntryOnAuth) {
    await router.replace({
      query: {
        ...route.query,
        entry: "join",
      },
    });
  }
};

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : t("common.operationFailed");

const emitFlowError = (message: string): void => {
  joinFlowError.value = message;
  emit("error", message);
};

const trackJoinResult = (payload: {
  actionResult: "success" | "failure" | "blocked";
  failureCode?: string;
  failureReason?: string;
}): void => {
  const prId = props.prId;
  if (prId === null) {
    return;
  }

  trackEvent("pr_join_result", {
    prId,
    scenarioType: props.scenarioType ?? undefined,
    eventId: props.eventId ?? undefined,
    entrySurface: props.entrySurface ?? undefined,
    candidateRank: props.candidateRank ?? undefined,
    ...payload,
  });
};

const closeJoinFlowModal = (): void => {
  showJoinFlowModal.value = false;
  joinFlowPending.value = false;
  joinFlowError.value = null;
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
    trackJoinResult({ actionResult: "success" });
    emit("joined", result);
    closeJoinFlowModal();
    openSuccessPrompt();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === PR_JOIN_GATE_UNRESOLVED_CODE) {
      trackJoinResult({
        actionResult: "blocked",
        failureCode: PR_JOIN_GATE_UNRESOLVED_CODE,
        failureReason: resolveErrorMessage(error),
      });
      showJoinFlowModal.value = true;
      return;
    }
    trackJoinResult(
      resolveTelemetryFailurePayload(
        error,
        "PR_JOIN_FAILED",
        resolveErrorMessage(error),
      ),
    );
    emitFlowError(resolveErrorMessage(error));
  } finally {
    joinFlowPending.value = false;
  }
};

const open = async (): Promise<void> => {
  if (openDisabled.value || flowPending.value) return;
  joinFlowError.value = null;
  showJoinFlowModal.value = true;
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

.join-success-modal__subscriptions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.join-success-modal__subscriptions-heading {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.join-success-modal__subscriptions-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.join-success-modal__subscriptions-description {
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
