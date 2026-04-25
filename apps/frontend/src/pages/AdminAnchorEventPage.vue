<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">{{ t("adminAnchorEvents.eventsTitle") }}</h2>
              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                @click="prepareNewEvent"
              >
                {{ t("adminAnchorEvents.newEventAction") }}
              </Button>
            </div>
            <div v-if="events.length === 0" class="hint">
              {{ t("adminAnchorEvents.emptyEvents") }}
            </div>
            <div v-else class="selection-list">
              <ChoiceCard
                v-for="event in events"
                :key="event.id"
                class="selection-btn"
                :active="!isCreatingEvent && selectedEventId === event.id"
                @click="selectEvent(event.id)"
              >
                <span>{{ event.title }}</span>
                <small>{{ event.status }}</small>
              </ChoiceCard>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #header>
      <header class="header">
        <h1 class="title">{{ t("adminAnchorEvents.title") }}</h1>
        <p class="subtitle">{{ t("adminAnchorEvents.subtitle") }}</p>
      </header>
    </template>

    <div class="stack">
      <LoadingIndicator
        v-if="workspaceQuery.isLoading.value"
        :message="t('common.loading')"
      />
      <ErrorToast
        v-else-if="workspaceQuery.error.value"
        :message="workspaceQuery.error.value.message"
        persistent
      />

      <template v-else>
        <div class="grid-2">
          <section class="panel">
            <div class="stack">
              <div class="section-header">
                <h2 class="card-title">
                  {{ t("adminAnchorEvents.activityInfoTitle") }}
                </h2>
              </div>

              <label class="field">
                <span class="field-label">{{ t("adminPR.eventNameLabel") }}</span>
                <input v-model="eventForm.title" class="field-input" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPR.eventTypeLabel") }}</span>
                <input v-model="eventForm.type" class="field-input" />
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminPR.eventDescriptionLabel")
                }}</span>
                <textarea
                  v-model="eventForm.description"
                  class="field-input field-textarea"
                ></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminPR.eventCoverImageLabel")
                }}</span>
                <input v-model="eventForm.coverImage" class="field-input" />
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminPR.eventBetaGroupQrCodeLabel")
                }}</span>
                <input v-model="eventForm.betaGroupQrCode" class="field-input" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPR.eventStatusLabel") }}</span>
                <select v-model="eventForm.status" class="field-input">
                  <option value="ACTIVE">{{ t("adminPR.statusActive") }}</option>
                  <option value="PAUSED">{{ t("adminPR.statusPaused") }}</option>
                  <option value="ARCHIVED">
                    {{ t("adminPR.statusArchived") }}
                  </option>
                </select>
              </label>

              <div class="grid-2">
                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.eventDefaultMinPartnersLabel")
                  }}</span>
                  <input
                    v-model.number="eventForm.defaultMinPartners"
                    class="field-input"
                    type="number"
                    min="2"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.eventDefaultMaxPartnersLabel")
                  }}</span>
                  <input
                    v-model.number="eventForm.defaultMaxPartners"
                    class="field-input"
                    type="number"
                    min="2"
                  />
                </label>
              </div>

              <p v-if="eventBoundsValidationMessage" class="error-message">
                {{ eventBoundsValidationMessage }}
              </p>

              <TimelinePolicyPicker
                v-model="eventPolicyValue"
                :title="t('adminAnchorEvents.participationDefaultsTitle')"
                :description="t('adminAnchorEvents.participationDefaultsDescription')"
                :event-start-at="previewStartAt"
                :validation-message="policyValidationMessage"
              />

              <Button
                appearance="pill"
                size="sm"
                type="button"
                :disabled="
                  createEventMutation.isPending.value ||
                  updateEventMutation.isPending.value ||
                  Boolean(eventBoundsValidationMessage) ||
                  Boolean(timePoolValidationMessage) ||
                  Boolean(policyValidationMessage)
                "
                @click="handleSaveEvent"
              >
                {{
                  createEventMutation.isPending.value ||
                  updateEventMutation.isPending.value
                    ? t("adminPR.saving")
                    : isCreatingEvent
                      ? t("adminPR.createEventAction")
                      : t("adminPR.saveEventAction")
                }}
              </Button>
            </div>
          </section>

          <section class="panel">
            <div class="stack">
              <h2 class="card-title">
                {{ t("adminAnchorEvents.locationPoolsTitle") }}
              </h2>

              <label class="field">
                <span class="field-label">{{
                  t("adminPR.eventLocationPoolLabel")
                }}</span>
                <textarea
                  v-model="eventForm.systemLocationPoolText"
                  class="field-input field-textarea"
                ></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{
                  t("adminPR.userLocationPoolLabel")
                }}</span>
                <textarea
                  v-model="eventForm.userLocationPoolText"
                  class="field-input field-textarea"
                ></textarea>
              </label>

              <p class="hint">{{ t("adminPR.eventPoiHint") }}</p>
            </div>
          </section>
        </div>

        <div class="grid-2">
          <section class="panel">
            <div class="stack">
              <h2 class="card-title">
                {{ t("adminAnchorEvents.timePoolStrategyTitle") }}
              </h2>

              <div class="grid-2">
                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.timePoolDurationLabel")
                  }}</span>
                  <input
                    v-model.number="eventForm.durationMinutes"
                    class="field-input"
                    type="number"
                    min="1"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.timePoolEarliestLeadLabel")
                  }}</span>
                  <input
                    v-model.number="eventForm.earliestLeadMinutes"
                    class="field-input"
                    type="number"
                    min="0"
                  />
                </label>
              </div>

              <label class="field">
                <span class="field-label">{{ t("adminPR.absoluteRulesLabel") }}</span>
                <textarea
                  v-model="eventForm.absoluteRulesText"
                  class="field-input field-textarea"
                ></textarea>
              </label>
              <p class="hint">{{ t("adminPR.absoluteRulesHint") }}</p>

              <label class="field">
                <span class="field-label">{{ t("adminPR.recurringRulesLabel") }}</span>
                <textarea
                  v-model="eventForm.recurringRulesText"
                  class="field-input field-textarea"
                ></textarea>
              </label>
              <p class="hint">{{ t("adminPR.recurringRulesHint") }}</p>

              <p v-if="timePoolValidationMessage" class="error-message">
                {{ timePoolValidationMessage }}
              </p>
            </div>
          </section>

          <section class="panel">
            <div class="stack">
              <h2 class="card-title">
                {{ t("adminAnchorEvents.timeWindowsTitle") }}
              </h2>
              <div v-if="selectedEvent === null" class="hint">
                {{ t("adminPR.selectEventForTimeWindowHint") }}
              </div>
              <div
                v-else-if="selectedEvent.timeWindows.length === 0"
                class="hint"
              >
                {{ t("adminPR.emptyTimeWindows") }}
              </div>
              <div v-else class="selection-list">
                <ChoiceCard
                  v-for="timeWindow in selectedEvent.timeWindows"
                  :key="timeWindow.key"
                  class="selection-btn"
                >
                  <span>{{ formatWindow(timeWindow.timeWindow) }}</span>
                </ChoiceCard>
              </div>
            </div>
          </section>
        </div>

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">
                {{ t("adminAnchorEvents.landingRolloutTitle") }}
              </h2>
            </div>

            <p class="hint">
              {{ t("adminAnchorEvents.landingRolloutDescription") }}
            </p>

            <div v-if="isCreatingEvent || selectedEventId === null" class="hint">
              {{ t("adminAnchorEvents.selectEventForLandingConfigHint") }}
            </div>

            <LoadingIndicator
              v-else-if="landingConfigQuery.isLoading.value"
              :message="t('common.loading')"
            />

            <p v-else-if="landingConfigQuery.error.value" class="error-message">
              {{ landingConfigQuery.error.value.message }}
            </p>

            <template v-else>
              <div class="grid-2">
                <label class="field">
                  <span class="field-label">{{
                    t("adminAnchorEvents.formRatioLabel")
                  }}</span>
                  <input
                    v-model.number="landingConfigForm.formRatio"
                    class="field-input"
                    type="number"
                    min="0"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminAnchorEvents.cardRichRatioLabel")
                  }}</span>
                  <input
                    v-model.number="landingConfigForm.cardRichRatio"
                    class="field-input"
                    type="number"
                    min="0"
                  />
                </label>
              </div>

              <label class="field">
                <span class="field-label">{{
                  t("adminAnchorEvents.assignmentRevisionLabel")
                }}</span>
                <input
                  v-model.number="landingConfigForm.assignmentRevision"
                  class="field-input"
                  type="number"
                  min="1"
                />
              </label>

              <p class="hint">
                {{ t("adminAnchorEvents.landingFallbackHint") }}
              </p>

              <p v-if="landingConfigValidationMessage" class="error-message">
                {{ landingConfigValidationMessage }}
              </p>

              <Button
                appearance="pill"
                size="sm"
                type="button"
                :disabled="
                  replaceLandingConfigMutation.isPending.value ||
                  Boolean(landingConfigValidationMessage)
                "
                @click="handleSaveLandingConfig"
              >
                {{
                  replaceLandingConfigMutation.isPending.value
                    ? t("adminPR.saving")
                    : t("adminAnchorEvents.saveLandingConfigAction")
                }}
              </Button>
            </template>
          </div>
        </section>

        <ErrorToast
          v-if="mutationErrorMessage"
          :message="mutationErrorMessage"
          @close="resetMutationErrors"
        />
      </template>
    </div>
  </DesktopPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminNavigationCard from "@/domains/admin/ui/composites/AdminNavigationCard.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";
import TimelinePolicyPicker from "@/shared/ui/forms/TimelinePolicyPicker.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  type AdminAnchorEventInput,
  type AdminAnchorEventWorkspaceResponse,
  type AdminAnchorTimePoolConfigInput,
  useAdminAnchorEventWorkspace,
  useCreateAdminAnchorEvent,
  useUpdateAdminAnchorEvent,
} from "@/domains/admin/queries/useAdminAnchorEvents";
import {
  useAdminAnchorEventLandingConfig,
  useReplaceAdminAnchorEventLandingConfig,
} from "@/domains/admin/queries/useAdminAnchorEventLandingConfig";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";
import { validateManualPartnerBounds } from "@/lib/validation";

type Workspace = NonNullable<AdminAnchorEventWorkspaceResponse>;
type EventRecord = Workspace["events"][number];

type EventForm = {
  title: string;
  type: string;
  description: string;
  systemLocationPoolText: string;
  userLocationPoolText: string;
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  absoluteRulesText: string;
  recurringRulesText: string;
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  defaultConfirmationStartOffsetMinutes: number;
  defaultConfirmationEndOffsetMinutes: number;
  defaultJoinLockOffsetMinutes: number;
  coverImage: string;
  betaGroupQrCode: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

type LandingConfigForm = {
  formRatio: number;
  cardRichRatio: number;
  assignmentRevision: number;
};

const DEFAULT_CONFIRMATION_START_OFFSET_MINUTES = 120;
const DEFAULT_CONFIRMATION_END_OFFSET_MINUTES = 30;
const DEFAULT_JOIN_LOCK_OFFSET_MINUTES = 30;

const emptyEventForm = (): EventForm => ({
  title: "",
  type: "",
  description: "",
  systemLocationPoolText: "",
  userLocationPoolText: "",
  durationMinutes: null,
  earliestLeadMinutes: null,
  absoluteRulesText: "",
  recurringRulesText: "",
  defaultMinPartners: null,
  defaultMaxPartners: null,
  defaultConfirmationStartOffsetMinutes:
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  defaultConfirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  coverImage: "",
  betaGroupQrCode: "",
  status: "ACTIVE",
});

const emptyLandingConfigForm = (): LandingConfigForm => ({
  formRatio: 50,
  cardRichRatio: 50,
  assignmentRevision: 1,
});

const toEventForm = (event: EventRecord): EventForm => ({
  title: event.title,
  type: event.type,
  description: event.description ?? "",
  systemLocationPoolText: event.systemLocationPool.join("\n"),
  userLocationPoolText: event.userLocationPool
    .map((entry) => `${entry.id},${entry.perBatchCap}`)
    .join("\n"),
  durationMinutes: event.timePoolConfig.durationMinutes ?? null,
  earliestLeadMinutes: event.timePoolConfig.earliestLeadMinutes ?? null,
  absoluteRulesText: event.timePoolConfig.startRules
    .filter((rule) => rule.kind === "ABSOLUTE")
    .map((rule) => rule.startAt)
    .join("\n"),
  recurringRulesText: event.timePoolConfig.startRules
    .filter((rule) => rule.kind === "RECURRING")
    .map((rule) => `${rule.weekdays.join(",")} ${rule.timeOfDay}`)
    .join("\n"),
  defaultMinPartners: event.defaultMinPartners,
  defaultMaxPartners: event.defaultMaxPartners,
  defaultConfirmationStartOffsetMinutes:
    event.defaultConfirmationStartOffsetMinutes ??
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  defaultConfirmationEndOffsetMinutes:
    event.defaultConfirmationEndOffsetMinutes ??
    DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  defaultJoinLockOffsetMinutes:
    event.defaultJoinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  coverImage: event.coverImage ?? "",
  betaGroupQrCode: event.betaGroupQrCode ?? "",
  status: event.status as EventForm["status"],
});

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminAnchorEventWorkspace(isAdmin);
const createEventMutation = useCreateAdminAnchorEvent();
const updateEventMutation = useUpdateAdminAnchorEvent();
const replaceLandingConfigMutation = useReplaceAdminAnchorEventLandingConfig();

const selectedEventIdRaw = ref("");
const isCreatingEvent = ref(false);
const eventForm = ref<EventForm>(emptyEventForm());
const landingConfigForm = ref<LandingConfigForm>(emptyLandingConfigForm());

const workspace = computed<Workspace | null>(
  () => workspaceQuery.data.value ?? null,
);
const events = computed<EventRecord[]>(() => workspace.value?.events ?? []);

const selectedEventId = computed<number | null>(() => {
  const parsed = Number(selectedEventIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedEvent = computed<EventRecord | null>(
  () =>
    events.value.find((event) => event.id === selectedEventId.value) ?? null,
);

const landingConfigQuery = useAdminAnchorEventLandingConfig(selectedEventId, isAdmin);

const previewStartAt = computed(
  () => selectedEvent.value?.timeWindows[0]?.timeWindow[0] ?? null,
);

const toLandingConfigForm = (
  config: NonNullable<typeof landingConfigQuery.data.value>["config"],
): LandingConfigForm => ({
  formRatio: config.variantRatioOverride?.FORM ?? 50,
  cardRichRatio: config.variantRatioOverride?.CARD_RICH ?? 50,
  assignmentRevision: config.assignmentRevision,
});

const normalizeLines = (value: string): string[] =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const normalizeUserLocationLines = (
  value: string,
): Array<{ id: string; perBatchCap: number }> =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const parts = entry.split(",").map((part) => part.trim());
      const id = parts[0] ?? "";
      const capRaw = parts[1] ?? "";
      const parsedCap = Number(capRaw);
      const perBatchCap =
        Number.isInteger(parsedCap) && parsedCap > 0 ? parsedCap : 1;
      return { id, perBatchCap };
    })
    .filter((entry) => entry.id.length > 0);

const normalizeNullableNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
};

const buildTimePoolConfig = (
  form: EventForm,
): AdminAnchorTimePoolConfigInput => {
  const absoluteRules = normalizeLines(form.absoluteRulesText).map(
    (startAt, index) => ({
      id: `absolute-${index + 1}`,
      kind: "ABSOLUTE" as const,
      startAt,
    }),
  );

  const recurringRules = normalizeLines(form.recurringRulesText)
    .map((line, index) => {
      const [weekdaysRaw = "", timeOfDayRaw = ""] = line.split(/\s+/, 2);
      const weekdays = weekdaysRaw
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
      const timeOfDay = timeOfDayRaw.trim();
      if (weekdays.length === 0 || !/^\d{2}:\d{2}$/.test(timeOfDay)) {
        return null;
      }
      return {
        id: `recurring-${index + 1}`,
        kind: "RECURRING" as const,
        weekdays,
        timeOfDay,
      };
    })
    .filter(
      (
        value,
      ): value is Extract<
        AdminAnchorTimePoolConfigInput["startRules"][number],
        { kind: "RECURRING" }
      > => value !== null,
    );

  return {
    durationMinutes: normalizeNullableNonNegativeInteger(form.durationMinutes),
    earliestLeadMinutes: normalizeNullableNonNegativeInteger(
      form.earliestLeadMinutes,
    ),
    startRules: [...absoluteRules, ...recurringRules],
  };
};

const formatWindow = (windowValue: [string | null, string | null]) =>
  formatLocalDateTimeWindowLabel(windowValue, {}, "?");

const eventBoundsValidationMessage = computed(() =>
  validateManualPartnerBounds(
    normalizeNullableNonNegativeInteger(eventForm.value.defaultMinPartners),
    normalizeNullableNonNegativeInteger(eventForm.value.defaultMaxPartners),
  ),
);

const timePoolValidationMessage = computed(() => {
  const config = buildTimePoolConfig(eventForm.value);
  if (config.startRules.length > 0 && config.durationMinutes === null) {
    return t("adminPR.timePoolDurationRequired");
  }
  if (
    config.startRules.some((rule) => rule.kind === "RECURRING") &&
    config.earliestLeadMinutes === null
  ) {
    return t("adminPR.timePoolEarliestLeadRequired");
  }
  if (
    normalizeLines(eventForm.value.recurringRulesText).length > 0 &&
    config.startRules.filter((rule) => rule.kind === "RECURRING").length !==
      normalizeLines(eventForm.value.recurringRulesText).length
  ) {
    return t("adminPR.recurringRulesFormatError");
  }
  return null;
});

const eventPolicyValue = computed({
  get: () => ({
    confirmationStartOffsetMinutes:
      eventForm.value.defaultConfirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes:
      eventForm.value.defaultConfirmationEndOffsetMinutes,
    joinLockOffsetMinutes: eventForm.value.defaultJoinLockOffsetMinutes,
  }),
  set: (value) => {
    eventForm.value = {
      ...eventForm.value,
      defaultConfirmationStartOffsetMinutes:
        value.confirmationStartOffsetMinutes,
      defaultConfirmationEndOffsetMinutes: value.confirmationEndOffsetMinutes,
      defaultJoinLockOffsetMinutes: value.joinLockOffsetMinutes,
    };
  },
});

const policyValidationMessage = computed(() => {
  if (
    eventForm.value.defaultConfirmationStartOffsetMinutes <=
    eventForm.value.defaultConfirmationEndOffsetMinutes
  ) {
    return t("adminPR.policyValidationStartBeforeEnd");
  }
  if (
    eventForm.value.defaultJoinLockOffsetMinutes <
    eventForm.value.defaultConfirmationEndOffsetMinutes
  ) {
    return t("adminPR.policyValidationJoinLockAfterConfirmationEnd");
  }
  return null;
});

const landingConfigValidationMessage = computed(() => {
  const formRatio = normalizeNullableNonNegativeInteger(
    landingConfigForm.value.formRatio,
  );
  const cardRichRatio = normalizeNullableNonNegativeInteger(
    landingConfigForm.value.cardRichRatio,
  );
  const assignmentRevision = normalizeNullableNonNegativeInteger(
    landingConfigForm.value.assignmentRevision,
  );

  if (assignmentRevision === null || assignmentRevision <= 0) {
    return t("adminAnchorEvents.assignmentRevisionValidation");
  }

  if (formRatio === null || cardRichRatio === null) {
    return t("adminAnchorEvents.landingRatioValidation");
  }

  if (formRatio + cardRichRatio !== 100) {
    return t("adminAnchorEvents.landingRatioValidation");
  }

  return null;
});

const mutationErrorMessage = computed(
  () =>
    createEventMutation.error.value?.message ||
    updateEventMutation.error.value?.message ||
    replaceLandingConfigMutation.error.value?.message ||
    null,
);

watch(
  [events, isAdmin, isCreatingEvent],
  ([nextEvents, adminReady, creating]) => {
    if (!adminReady || creating || nextEvents.length === 0) {
      if (!adminReady || nextEvents.length === 0) {
        selectedEventIdRaw.value = "";
      }
      return;
    }
    if (
      !nextEvents.some((event) => String(event.id) === selectedEventIdRaw.value)
    ) {
      selectedEventIdRaw.value = String(nextEvents[0].id);
    }
  },
  { immediate: true },
);

watch(
  [selectedEvent, isCreatingEvent],
  ([event, creating]) => {
    if (creating || !event) {
      eventForm.value = emptyEventForm();
      return;
    }
    eventForm.value = toEventForm(event);
  },
  { immediate: true },
);

watch(
  [() => landingConfigQuery.data.value, isCreatingEvent],
  ([landingConfig, creating]) => {
    if (creating || !landingConfig) {
      landingConfigForm.value = emptyLandingConfigForm();
      return;
    }

    landingConfigForm.value = toLandingConfigForm(landingConfig.config);
  },
  { immediate: true },
);

const prepareNewEvent = () => {
  isCreatingEvent.value = true;
  selectedEventIdRaw.value = "";
  eventForm.value = emptyEventForm();
};

const selectEvent = (eventId: number) => {
  isCreatingEvent.value = false;
  selectedEventIdRaw.value = String(eventId);
};

const resetMutationErrors = () => {
  createEventMutation.reset();
  updateEventMutation.reset();
  replaceLandingConfigMutation.reset();
};

const handleSaveEvent = async () => {
  if (
    eventBoundsValidationMessage.value ||
    timePoolValidationMessage.value ||
    policyValidationMessage.value
  ) {
    return;
  }

  const input: AdminAnchorEventInput = {
    title: eventForm.value.title.trim(),
    type: eventForm.value.type.trim(),
    description: eventForm.value.description.trim() || null,
    systemLocationPool: normalizeLines(eventForm.value.systemLocationPoolText),
    userLocationPool: normalizeUserLocationLines(
      eventForm.value.userLocationPoolText,
    ),
    timePoolConfig: buildTimePoolConfig(eventForm.value),
    defaultMinPartners: normalizeNullableNonNegativeInteger(
      eventForm.value.defaultMinPartners,
    ),
    defaultMaxPartners: normalizeNullableNonNegativeInteger(
      eventForm.value.defaultMaxPartners,
    ),
    defaultConfirmationStartOffsetMinutes:
      eventForm.value.defaultConfirmationStartOffsetMinutes,
    defaultConfirmationEndOffsetMinutes:
      eventForm.value.defaultConfirmationEndOffsetMinutes,
    defaultJoinLockOffsetMinutes: eventForm.value.defaultJoinLockOffsetMinutes,
    coverImage: eventForm.value.coverImage.trim() || null,
    betaGroupQrCode: eventForm.value.betaGroupQrCode.trim() || null,
    status: eventForm.value.status,
  };

  try {
    const result =
      isCreatingEvent.value || selectedEventId.value === null
        ? await createEventMutation.mutateAsync(input)
        : await updateEventMutation.mutateAsync({
            eventId: selectedEventId.value,
            input,
          });
    isCreatingEvent.value = false;
    selectedEventIdRaw.value = String(result.id);
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleSaveLandingConfig = async () => {
  if (
    landingConfigValidationMessage.value ||
    selectedEventId.value === null ||
    isCreatingEvent.value
  ) {
    return;
  }

  const formRatio =
    normalizeNullableNonNegativeInteger(landingConfigForm.value.formRatio) ?? 100;
  const cardRichRatio =
    normalizeNullableNonNegativeInteger(landingConfigForm.value.cardRichRatio) ?? 0;
  const assignmentRevision =
    normalizeNullableNonNegativeInteger(
      landingConfigForm.value.assignmentRevision,
    ) ?? 1;

  try {
    await replaceLandingConfigMutation.mutateAsync({
      eventId: selectedEventId.value,
      input: {
        variantRatioOverride: {
          FORM: formRatio,
          CARD_RICH: cardRichRatio,
        },
        assignmentRevision,
      },
    });
  } catch {
    // Mutation state already drives page-level feedback.
  }
};
</script>

<style lang="scss" scoped>
.page,
.sidebar,
.stack,
.header,
.selection-list {
  display: flex;
  flex-direction: column;
}

.sidebar,
.stack,
.header,
.selection-list {
  gap: var(--sys-spacing-med);
}

.header {
  gap: var(--sys-spacing-xs);
}

.title {
  margin: 0;
  @include mx.pu-font(headline-small);
}

.subtitle {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.panel {
  padding: var(--sys-spacing-lg);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface-container);
}

.card-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.hint {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.error-message {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-error);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.field-label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.field-textarea {
  min-height: 96px;
  resize: vertical;
}

.grid-2 {
  display: grid;
  gap: var(--sys-spacing-med);
}

@media (min-width: 880px) {
  .grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
