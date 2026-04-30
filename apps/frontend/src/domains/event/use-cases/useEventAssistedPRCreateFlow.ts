import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import type { TimeWindow } from "@/domains/event/model/time-window-view";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import type { ApiError } from "@/shared/api/error";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";

type EventAssistedPRCreateInput = {
  targetTimeWindow: TimeWindow | null;
  locationId: string | null;
};

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const WECHAT_AUTH_BLOCKING_CODES = new Set([
  "WECHAT_AUTH_REQUIRED",
  "WECHAT_BIND_REQUIRED",
]);

const isWeChatAuthBlockingError = (
  error: unknown,
): error is CreateEventAssistedPRError => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as CreateEventAssistedPRError;
  return (
    apiError.status === 401 &&
    typeof apiError.code === "string" &&
    WECHAT_AUTH_BLOCKING_CODES.has(apiError.code)
  );
};

export const useEventAssistedPRCreateFlow = (
  event: Ref<AnchorEventDetailResponse | null>,
) => {
  const router = useRouter();
  const { t } = useI18n();
  const createEventAssistedPRMutation = useCreateEventAssistedPR();
  const replayErrorMessage = ref<string | null>(null);
  const pendingCreateReplayRunning = ref(false);

  const isCreatePending = computed(
    () => createEventAssistedPRMutation.isPending.value,
  );

  const createActionErrorMessage = computed(() => {
    const createAnchorError = createEventAssistedPRMutation.error
      .value as CreateEventAssistedPRError | null;
    if (createAnchorError) {
      switch (createAnchorError.code) {
        case JOIN_TIME_WINDOW_CONFLICT_CODE:
          return t("anchorEvent.createCard.errors.timeWindowConflict");
        case "WECHAT_AUTH_REQUIRED":
          return t("anchorEvent.createCard.errors.wechatAuthRequired");
        case "LOCATION_CAP_REACHED":
          return t("anchorEvent.createCard.errors.locationCapReached");
        case "ANCHOR_EVENT_NOT_FOUND":
          return t("anchorEvent.createCard.errors.eventUnavailable");
        default:
          return (
            createAnchorError.message ||
            t("anchorEvent.createCard.errors.createFailed")
          );
      }
    }
    return null;
  });

  const buildEventAssistedFields = ({
    targetTimeWindow,
    locationId,
  }: EventAssistedPRCreateInput): PartnerRequestFields => {
    const currentEvent = event.value;
    if (!currentEvent) {
      throw new Error(t("common.operationFailed"));
    }

    const normalizedLocation = locationId?.trim() ?? "";
    if (!targetTimeWindow || normalizedLocation.length === 0) {
      throw new Error(t("common.operationFailed"));
    }

    return {
      title: undefined,
      type: currentEvent.type,
      time: targetTimeWindow,
      location: normalizedLocation,
      minPartners: currentEvent.defaultMinPartners ?? 2,
      maxPartners: currentEvent.defaultMaxPartners ?? null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
    };
  };

  const createEventAssistedPR = async ({
    targetTimeWindow,
    locationId,
  }: EventAssistedPRCreateInput) => {
    createEventAssistedPRMutation.reset();
    replayErrorMessage.value = null;

    const currentEvent = event.value;
    if (!currentEvent) {
      return;
    }

    const fields = buildEventAssistedFields({
      targetTimeWindow,
      locationId,
    });

    try {
      const created = await createEventAssistedPRMutation.mutateAsync({
        eventId: currentEvent.id,
        fields,
      });
      await router.push(
        `${created.canonicalPath}?entry=create&fromEvent=${currentEvent.id}`,
      );
    } catch (error) {
      if (isWeChatAuthBlockingError(error)) {
        return;
      }
      throw error;
    }
  };

  const attemptPendingCreateReplay = async () => {
    if (pendingCreateReplayRunning.value) {
      return;
    }
    const currentEvent = event.value;
    if (!currentEvent) {
      return;
    }

    const pending = readPendingWeChatAction();
    if (
      !pending ||
      pending.kind !== "EVENT_ASSISTED_PR_CREATE" ||
      pending.eventId !== currentEvent.id
    ) {
      return;
    }

    pendingCreateReplayRunning.value = true;
    replayErrorMessage.value = null;
    clearPendingWeChatAction();
    try {
      const created = await createEventAssistedPRMutation.mutateAsync({
        eventId: currentEvent.id,
        fields: {
          title: undefined,
          type: pending.fields.type,
          time: pending.fields.time,
          location: pending.fields.location,
          minPartners: pending.fields.minPartners,
          maxPartners: pending.fields.maxPartners,
          partners: [],
          budget: null,
          preferences: [],
          notes: null,
        },
      });
      await router.push(
        `${created.canonicalPath}?entry=create&fromEvent=${currentEvent.id}`,
      );
    } catch (error) {
      if (!isWeChatAuthBlockingError(error)) {
        const apiError = error as ApiError;
        replayErrorMessage.value =
          apiError.message ?? t("common.operationFailed");
      }
    } finally {
      pendingCreateReplayRunning.value = false;
    }
  };

  watch(
    () => event.value?.id ?? null,
    () => {
      void attemptPendingCreateReplay();
    },
    { immediate: true },
  );

  onMounted(() => {
    void attemptPendingCreateReplay();
  });

  return {
    createEventAssistedPR,
    createActionErrorMessage,
    isCreatePending,
    replayErrorMessage,
  };
};
