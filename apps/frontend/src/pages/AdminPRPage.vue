<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">{{ t("adminPR.eventsTitle") }}</h2>
              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                @click="prepareNewEvent"
              >
                {{ t("adminPR.newEventAction") }}
              </Button>
            </div>
            <div v-if="events.length === 0" class="hint">
              {{ t("adminPR.emptyEvents") }}
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
        <h1 class="title">{{ t("adminPR.title") }}</h1>
        <p class="subtitle">{{ t("adminPR.subtitle") }}</p>
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
              <h2 class="card-title">
                {{ t("adminPR.eventFormTitle") }}
              </h2>
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.eventNameLabel")
                }}</span
                ><input v-model="eventForm.title" class="field-input"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.eventTypeLabel")
                }}</span
                ><input v-model="eventForm.type" class="field-input"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.eventDescriptionLabel")
                }}</span
                ><textarea
                  v-model="eventForm.description"
                  class="field-input field-textarea"
                ></textarea>
              </label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.eventCoverImageLabel")
                }}</span
                ><input v-model="eventForm.coverImage" class="field-input"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.eventBetaGroupQrCodeLabel")
                }}</span
                ><input v-model="eventForm.betaGroupQrCode" class="field-input"
              /></label>
              <label class="field">
                <span class="field-label">{{
                  t("adminPR.eventStatusLabel")
                }}</span>
                <select v-model="eventForm.status" class="field-input">
                  <option value="ACTIVE">
                    {{ t("adminPR.statusActive") }}
                  </option>
                  <option value="PAUSED">
                    {{ t("adminPR.statusPaused") }}
                  </option>
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
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.eventLocationPoolLabel")
                }}</span
                ><textarea
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
                <span class="field-label">{{
                  t("adminPR.absoluteRulesLabel")
                }}</span>
                <textarea
                  v-model="eventForm.absoluteRulesText"
                  class="field-input field-textarea"
                ></textarea>
              </label>
              <p class="hint">{{ t("adminPR.absoluteRulesHint") }}</p>
              <label class="field">
                <span class="field-label">{{
                  t("adminPR.recurringRulesLabel")
                }}</span>
                <textarea
                  v-model="eventForm.recurringRulesText"
                  class="field-input field-textarea"
                ></textarea>
              </label>
              <p class="hint">{{ t("adminPR.recurringRulesHint") }}</p>
              <p v-if="timePoolValidationMessage" class="error-message">
                {{ timePoolValidationMessage }}
              </p>
              <Button
                appearance="pill"
                size="sm"
                type="button"
                :disabled="
                  createEventMutation.isPending.value ||
                  updateEventMutation.isPending.value ||
                  Boolean(eventBoundsValidationMessage) ||
                  Boolean(timePoolValidationMessage)
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
              <div class="section-header">
                <h2 class="card-title">
                  {{ t("adminPR.timeWindowsTitle") }}
                </h2>
              </div>
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
                  v-for="batch in selectedEvent.timeWindows"
                  :key="batch.key"
                  class="selection-btn"
                  :active="selectedBatchId === batch.key"
                  @click="selectBatch(batch.key)"
                >
                  <span>{{ formatWindow(batch.timeWindow) }}</span>
                  <small>{{
                    t("adminPR.generatedPRCount", {
                      count: batch.prs.length,
                    })
                  }}</small>
                </ChoiceCard>
              </div>
            </div>
          </section>
        </div>

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">
                {{ t("adminPR.prsTitle") }}
              </h2>
              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                :disabled="selectedBatch === null || selectedEvent === null"
                @click="prepareNewPR"
              >
                {{ t("adminPR.newPRAction") }}
              </Button>
            </div>

            <div v-if="selectedBatch === null" class="hint">
              {{ t("adminPR.selectTimeWindowHint") }}
            </div>
            <div v-else-if="selectedBatch.prs.length === 0" class="hint">
              {{ t("adminPR.emptyPRs") }}
            </div>
            <div v-else class="selection-list selection-list--grid">
              <ChoiceCard
                v-for="pr in selectedBatch.prs"
                :key="pr.prId"
                class="selection-btn"
                :active="!isCreatingPR && selectedPRId === pr.prId"
                @click="selectPR(pr.prId)"
              >
                <span>{{ pr.title || pr.location || `#${pr.prId}` }}</span>
                <small>{{ pr.status }} / {{ pr.visibilityStatus }}</small>
                <small>{{
                  t("adminPR.partnerCountWithValue", {
                    count: pr.partnerCount,
                  })
                }}</small>
              </ChoiceCard>
            </div>

            <div
              v-if="selectedBatch !== null && selectedEvent !== null"
              class="stack inset"
            >
              <h3 class="card-title">
                {{ t("adminPR.prFormTitle") }}
              </h3>
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.prTitleLabel")
                }}</span
                ><input
                  v-model="prForm.title"
                  class="field-input"
                  :disabled="!canEditPRContent"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.prTypeLabel")
                }}</span
                ><input
                  v-model="prForm.type"
                  class="field-input"
                  :disabled="!canEditPRContent"
              /></label>
              <label class="field">
                <span class="field-label">{{
                  t("adminPR.prLocationLabel")
                }}</span>
                <select
                  v-model="prForm.location"
                  class="field-input"
                  :disabled="!canEditPRContent || !hasLocationOptions"
                >
                  <option v-if="!hasLocationOptions" value="">
                    {{ t("adminPR.noLocationOption") }}
                  </option>
                  <option
                    v-for="location in adminLocationOptions"
                    :key="location"
                    :value="location"
                  >
                    {{ location }}
                  </option>
                </select>
              </label>
              <div class="grid-2">
                <label class="field"
                  ><span class="field-label">{{
                    t("adminPR.prMinPartnersLabel")
                  }}</span
                  ><input
                    v-model.number="prForm.minPartners"
                    class="field-input"
                    type="number"
                    min="2"
                    :disabled="!canEditPRContent"
                /></label>
                <label class="field"
                  ><span class="field-label">{{
                    t("adminPR.prMaxPartnersLabel")
                  }}</span
                  ><input
                    v-model.number="prForm.maxPartners"
                    class="field-input"
                    type="number"
                    min="2"
                    :disabled="!canEditPRContent"
                /></label>
              </div>
              <p v-if="prBoundsValidationMessage" class="error-message">
                {{ prBoundsValidationMessage }}
              </p>
              <TimelinePolicyPicker
                v-model="prPolicyValue"
                :title="t('adminPR.participationPolicyTitle')"
                :description="t('adminPR.participationPolicyDescription')"
                :event-start-at="selectedBatch.timeWindow[0]"
                :booking-deadline-at="
                  selectedPR?.effectiveBookingDeadlineAt ?? null
                "
                :disabled="!canEditPRContent"
                :validation-message="policyValidationMessage"
              />
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.prPreferencesLabel")
                }}</span
                ><input
                  v-model="prForm.preferencesText"
                  class="field-input"
                  :disabled="!canEditPRContent"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminPR.prNotesLabel")
                }}</span
                ><textarea
                  v-model="prForm.notes"
                  class="field-input field-textarea"
                  :disabled="!canEditPRContent"
                ></textarea>
              </label>
              <label class="field">
                <span class="field-label">{{
                  t("adminPR.prStatusLabel")
                }}</span>
                <select v-model="prForm.status" class="field-input">
                  <option value="OPEN">OPEN</option>
                  <option value="READY">READY</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">{{
                  t("adminPR.prVisibilityLabel")
                }}</span>
                <select v-model="prForm.visibilityStatus" class="field-input">
                  <option value="VISIBLE">
                    {{ t("adminPR.visibilityVisible") }}
                  </option>
                  <option value="HIDDEN">
                    {{ t("adminPR.visibilityHidden") }}
                  </option>
                </select>
              </label>
              <p v-if="!hasLocationOptions" class="hint">
                {{ t("adminPR.prLocationHint") }}
              </p>
              <p class="hint">{{ t("adminPR.prTimeHint") }}</p>
              <p v-if="policyRecommendationMessage" class="hint">
                {{ policyRecommendationMessage }}
              </p>
              <p v-if="selectedPR?.bookingTriggeredAt" class="hint">
                {{
                  t("adminPR.bookingTriggeredAtLabel", {
                    dateTime: formatDateTime(selectedPR.bookingTriggeredAt),
                  })
                }}
              </p>
              <p v-if="!canEditPRContent" class="hint">
                {{ t("adminPR.prContentLockedHint") }}
              </p>
              <Button
                appearance="pill"
                size="sm"
                type="button"
                :disabled="
                  isSavingPR ||
                  (isCreatingPR && !hasLocationOptions) ||
                  Boolean(policyValidationMessage) ||
                  ((isCreatingPR || canEditPRContent) &&
                    Boolean(prBoundsValidationMessage))
                "
                @click="handleSavePR"
              >
                {{
                  isSavingPR
                    ? t("adminPR.saving")
                    : isCreatingPR
                      ? t("adminPR.createPRAction")
                      : t("adminPR.savePRAction")
                }}
              </Button>

            </div>
          </div>
        </section>
      </template>

      <ErrorToast
        v-if="mutationErrorMessage"
        :message="mutationErrorMessage"
        @close="resetMutationErrors"
      />
    </div>
  </DesktopPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminNavigationCard from "@/domains/admin/ui/composites/AdminNavigationCard.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  type AdminAnchorTimePoolConfigInput,
  useAdminPRWorkspace,
  useCreateAdminAnchorEvent,
  useCreateAdminPR,
  useUpdateAdminAnchorEvent,
  useUpdateAdminPRContent,
  useUpdateAdminPRStatus,
  useUpdateAdminPRVisibility,
  type AdminPRWorkspaceResponse,
} from "@/domains/admin/queries/useAdminAnchorManagement";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";
import {
  formatLocalDateTimeValue,
  formatLocalDateTimeWindowLabel,
} from "@/shared/datetime/formatLocalDateTime";
import TimelinePolicyPicker from "@/shared/ui/forms/TimelinePolicyPicker.vue";
import { validateManualPartnerBounds } from "@/lib/validation";

type Workspace = NonNullable<AdminPRWorkspaceResponse>;
type EventRecord = Workspace["events"][number];
type BatchRecord = EventRecord["timeWindows"][number];
type PRRecord = BatchRecord["prs"][number];
type EventForm = {
  title: string;
  type: string;
  description: string;
  coverImage: string;
  betaGroupQrCode: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
  systemLocationPoolText: string;
  userLocationPoolText: string;
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  absoluteRulesText: string;
  recurringRulesText: string;
};
type PRForm = {
  title: string;
  type: string;
  location: string;
  minPartners: number | null;
  maxPartners: number | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  preferencesText: string;
  notes: string;
  status: "OPEN" | "READY" | "ACTIVE" | "CLOSED";
  visibilityStatus: "VISIBLE" | "HIDDEN";
};

const resolveDefaultMinPartners = (value: number | null | undefined): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 2
    ? value
    : 2;

const emptyEventForm = (): EventForm => ({
  title: "",
  type: "",
  description: "",
  coverImage: "",
  betaGroupQrCode: "",
  status: "ACTIVE",
  defaultMinPartners: 2,
  defaultMaxPartners: null,
  systemLocationPoolText: "",
  userLocationPoolText: "",
  durationMinutes: null,
  earliestLeadMinutes: null,
  absoluteRulesText: "",
  recurringRulesText: "",
});
const emptyPRForm = (location = "", type = "", minPartners = 2): PRForm => ({
  title: "",
  type,
  location,
  minPartners,
  maxPartners: null,
  confirmationStartOffsetMinutes: 120,
  confirmationEndOffsetMinutes: 30,
  joinLockOffsetMinutes: 30,
  preferencesText: "",
  notes: "",
  status: "OPEN",
  visibilityStatus: "VISIBLE",
});
const toEventForm = (event: EventRecord): EventForm => ({
  title: event.title,
  type: event.type,
  description: event.description ?? "",
  coverImage: event.coverImage ?? "",
  betaGroupQrCode: event.betaGroupQrCode ?? "",
  status: event.status as EventForm["status"],
  defaultMinPartners: resolveDefaultMinPartners(event.defaultMinPartners),
  defaultMaxPartners: event.defaultMaxPartners ?? null,
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
});
const toPRForm = (pr: PRRecord): PRForm => ({
  title: pr.title ?? "",
  type: pr.type,
  location: pr.location ?? "",
  minPartners: resolveDefaultMinPartners(pr.minPartners),
  maxPartners: pr.maxPartners,
  confirmationStartOffsetMinutes: pr.confirmationStartOffsetMinutes,
  confirmationEndOffsetMinutes: pr.confirmationEndOffsetMinutes,
  joinLockOffsetMinutes: pr.joinLockOffsetMinutes,
  preferencesText: pr.preferences.join(", "),
  notes: pr.notes ?? "",
  status: pr.status as PRForm["status"],
  visibilityStatus: pr.visibilityStatus as PRForm["visibilityStatus"],
});

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminPRWorkspace(isAdmin);
const createEventMutation = useCreateAdminAnchorEvent();
const updateEventMutation = useUpdateAdminAnchorEvent();
const createPRMutation = useCreateAdminPR();
const updatePRContentMutation = useUpdateAdminPRContent();
const updatePRStatusMutation = useUpdateAdminPRStatus();
const updatePRVisibilityMutation = useUpdateAdminPRVisibility();
const selectedEventIdRaw = ref("");
const selectedBatchIdRaw = ref("");
const selectedPRIdRaw = ref("");
const isCreatingEvent = ref(false);
const isCreatingPR = ref(false);
const eventForm = ref<EventForm>(emptyEventForm());
const prForm = ref<PRForm>(emptyPRForm());
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
const selectedBatchId = computed<string | null>(() =>
  selectedBatchIdRaw.value.trim() || null,
);
const selectedBatch = computed<BatchRecord | null>(
  () =>
    selectedEvent.value?.timeWindows.find(
      (batch) => batch.key === selectedBatchId.value,
    ) ?? null,
);
const selectedPRId = computed<number | null>(() => {
  const parsed = Number(selectedPRIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});
const selectedPR = computed<PRRecord | null>(
  () =>
    selectedBatch.value?.prs.find((pr) => pr.prId === selectedPRId.value) ??
    null,
);
const canEditPRContent = computed(
  () => isCreatingPR.value || selectedPR.value?.status === "OPEN",
);
const collectEventLocationOptions = (
  event: EventRecord | null | undefined,
): string[] => {
  if (!event) return [];
  const ids = [
    ...event.systemLocationPool,
    ...event.userLocationPool.map((entry) => entry.id),
  ]
    .map((locationId) => locationId.trim())
    .filter((locationId) => locationId.length > 0);
  return Array.from(new Set(ids));
};
const firstEventLocation = (event: EventRecord | null | undefined): string =>
  collectEventLocationOptions(event)[0] ?? "";
const adminLocationOptions = computed(() =>
  collectEventLocationOptions(selectedEvent.value),
);
const hasLocationOptions = computed(
  () => adminLocationOptions.value.length > 0,
);
const isSavingPR = computed(
  () =>
    createPRMutation.isPending.value ||
    updatePRContentMutation.isPending.value ||
    updatePRStatusMutation.isPending.value ||
    updatePRVisibilityMutation.isPending.value,
);
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
const normalizeComma = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
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
    .filter((value): value is Extract<
      AdminAnchorTimePoolConfigInput["startRules"][number],
      { kind: "RECURRING" }
    > => value !== null);

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
const formatDateTime = (value: string | null) =>
  formatLocalDateTimeValue(value) ?? "-";
const eventBoundsValidationMessage = computed(() =>
  validateManualPartnerBounds(
    normalizeNullableNonNegativeInteger(eventForm.value.defaultMinPartners),
    normalizeNullableNonNegativeInteger(eventForm.value.defaultMaxPartners),
  ),
);
const prBoundsValidationMessage = computed(() =>
  validateManualPartnerBounds(
    normalizeNullableNonNegativeInteger(prForm.value.minPartners),
    normalizeNullableNonNegativeInteger(prForm.value.maxPartners),
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
const mutationErrorMessage = computed(
  () =>
    createEventMutation.error.value?.message ||
    updateEventMutation.error.value?.message ||
    createPRMutation.error.value?.message ||
    updatePRContentMutation.error.value?.message ||
    updatePRStatusMutation.error.value?.message ||
    updatePRVisibilityMutation.error.value?.message ||
    null,
);

const prPolicyValue = computed({
  get: () => ({
    confirmationStartOffsetMinutes: prForm.value.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: prForm.value.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: prForm.value.joinLockOffsetMinutes,
  }),
  set: (value) => {
    prForm.value = {
      ...prForm.value,
      confirmationStartOffsetMinutes: value.confirmationStartOffsetMinutes,
      confirmationEndOffsetMinutes: value.confirmationEndOffsetMinutes,
      joinLockOffsetMinutes: value.joinLockOffsetMinutes,
    };
  },
});

const policyValidationMessage = computed(() => {
  if (
    prForm.value.confirmationStartOffsetMinutes <=
    prForm.value.confirmationEndOffsetMinutes
  ) {
    return t("adminPR.policyValidationStartBeforeEnd");
  }

  if (
    prForm.value.joinLockOffsetMinutes <
    prForm.value.confirmationEndOffsetMinutes
  ) {
    return t("adminPR.policyValidationJoinLockAfterConfirmationEnd");
  }

  return null;
});

const policyRecommendationMessage = computed(() => {
  const batchStartRaw = selectedBatch.value?.timeWindow[0] ?? null;
  const batchStart = batchStartRaw ? new Date(batchStartRaw) : null;
  const bookingDeadlineRaw =
    selectedPR.value?.effectiveBookingDeadlineAt ?? null;
  const bookingDeadline = bookingDeadlineRaw
    ? new Date(bookingDeadlineRaw)
    : null;
  if (
    batchStart &&
    !Number.isNaN(batchStart.getTime()) &&
    bookingDeadline &&
    !Number.isNaN(bookingDeadline.getTime())
  ) {
    const confirmationEndAt = new Date(
      batchStart.getTime() -
        prForm.value.confirmationEndOffsetMinutes * 60 * 1000,
    );
    const recommendedConfirmationEndLatestAt = new Date(
      bookingDeadline.getTime() - 30 * 60 * 1000,
    );
    if (
      confirmationEndAt.getTime() > recommendedConfirmationEndLatestAt.getTime()
    ) {
      return t("adminPR.policyValidationDeadlineAfterConfirmationEnd");
    }
  }

  return null;
});

watch(
  [events, isAdmin, isCreatingEvent],
  ([nextEvents, adminReady, creating]) => {
    if (!adminReady || creating || nextEvents.length === 0) {
      if (!adminReady || nextEvents.length === 0) selectedEventIdRaw.value = "";
      return;
    }
    if (
      !nextEvents.some((event) => String(event.id) === selectedEventIdRaw.value)
    )
      selectedEventIdRaw.value = String(nextEvents[0].id);
  },
  { immediate: true },
);
watch(
  [selectedEvent, isCreatingEvent],
  ([event, creating]) => {
    if (creating) {
      eventForm.value = emptyEventForm();
      selectedBatchIdRaw.value = "";
      selectedPRIdRaw.value = "";
      prForm.value = emptyPRForm();
      return;
    }
    if (!event) {
      eventForm.value = emptyEventForm();
      selectedBatchIdRaw.value = "";
      selectedPRIdRaw.value = "";
      prForm.value = emptyPRForm();
      return;
    }
    eventForm.value = toEventForm(event);
    if (
      !event.timeWindows.some(
        (batch) => batch.key === selectedBatchIdRaw.value,
      )
    )
      selectedBatchIdRaw.value = event.timeWindows[0]
        ? event.timeWindows[0].key
        : "";
  },
  { immediate: true },
);
watch(
  [selectedBatch, selectedEvent],
  ([batch, event]) => {
    if (!batch || !event) {
      selectedPRIdRaw.value = "";
      prForm.value = emptyPRForm(
        firstEventLocation(event),
        event?.type ?? "",
        resolveDefaultMinPartners(event?.defaultMinPartners),
      );
      return;
    }
    if (!batch.prs.some((pr) => String(pr.prId) === selectedPRIdRaw.value))
      selectedPRIdRaw.value = batch.prs[0] ? String(batch.prs[0].prId) : "";
  },
  { immediate: true },
);
watch(
  [selectedPR, isCreatingPR, selectedEvent],
  ([pr, creating, event]) => {
    if (creating) {
      prForm.value = emptyPRForm(
        firstEventLocation(event),
        event?.type ?? "",
        resolveDefaultMinPartners(event?.defaultMinPartners),
      );
      return;
    }
    if (!pr || !event) {
      prForm.value = emptyPRForm(
        firstEventLocation(event),
        event?.type ?? "",
        resolveDefaultMinPartners(event?.defaultMinPartners),
      );
      return;
    }
    prForm.value = {
      ...toPRForm(pr),
      location: pr.location ?? firstEventLocation(event),
      type: pr.type,
    };
  },
  { immediate: true },
);

const prepareNewEvent = () => {
  isCreatingEvent.value = true;
  isCreatingPR.value = false;
  selectedEventIdRaw.value = "";
  selectedBatchIdRaw.value = "";
  selectedPRIdRaw.value = "";
  eventForm.value = emptyEventForm();
  prForm.value = emptyPRForm();
};
const selectEvent = (eventId: number) => {
  isCreatingEvent.value = false;
  isCreatingPR.value = false;
  selectedEventIdRaw.value = String(eventId);
};
const selectBatch = (batchId: string) => {
  isCreatingPR.value = false;
  selectedBatchIdRaw.value = batchId;
};
const prepareNewPR = () => {
  if (!selectedEvent.value || selectedBatchId.value === null) return;
  isCreatingPR.value = true;
  selectedPRIdRaw.value = "";
  prForm.value = emptyPRForm(
    firstEventLocation(selectedEvent.value),
    selectedEvent.value.type,
    resolveDefaultMinPartners(selectedEvent.value.defaultMinPartners),
  );
};
const selectPR = (prId: number) => {
  isCreatingPR.value = false;
  selectedPRIdRaw.value = String(prId);
};
const resetMutationErrors = () => {
  createEventMutation.reset();
  updateEventMutation.reset();
  createPRMutation.reset();
  updatePRContentMutation.reset();
  updatePRStatusMutation.reset();
  updatePRVisibilityMutation.reset();
};

const handleSaveEvent = async () => {
  if (eventBoundsValidationMessage.value || timePoolValidationMessage.value)
    return;
  const input = {
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
    // Mutation state already drives the page-level error toast.
  }
};
const handleSavePR = async () => {
  if (
    !selectedEvent.value ||
    !hasLocationOptions.value ||
    selectedBatchId.value === null
  )
    return;
  if (
    (isCreatingPR.value || canEditPRContent.value) &&
    prBoundsValidationMessage.value
  )
    return;
  if (
    isCreatingPR.value ||
    selectedPRId.value === null ||
    selectedBatch.value === null
  ) {
    try {
      const result = await createPRMutation.mutateAsync({
        eventId: selectedEvent.value.id,
        input: {
          timeWindow: selectedBatch.value!.timeWindow,
          title: prForm.value.title.trim() || null,
          type: prForm.value.type.trim() || null,
          location: prForm.value.location,
          minPartners: prForm.value.minPartners,
          maxPartners: prForm.value.maxPartners,
          confirmationStartOffsetMinutes:
            prForm.value.confirmationStartOffsetMinutes,
          confirmationEndOffsetMinutes:
            prForm.value.confirmationEndOffsetMinutes,
          joinLockOffsetMinutes: prForm.value.joinLockOffsetMinutes,
          preferences: normalizeComma(prForm.value.preferencesText),
          notes: prForm.value.notes.trim() || null,
        },
      });
      isCreatingPR.value = false;
      selectedPRIdRaw.value = String(result.root.id);
    } catch {
      // Mutation state already drives the page-level error toast.
    }
    return;
  }
  try {
    if (canEditPRContent.value) {
      await updatePRContentMutation.mutateAsync({
        prId: selectedPRId.value,
        input: {
          title: prForm.value.title.trim() || null,
          type: prForm.value.type.trim(),
          location: prForm.value.location,
          minPartners: prForm.value.minPartners,
          maxPartners: prForm.value.maxPartners,
          confirmationStartOffsetMinutes:
            prForm.value.confirmationStartOffsetMinutes,
          confirmationEndOffsetMinutes:
            prForm.value.confirmationEndOffsetMinutes,
          joinLockOffsetMinutes: prForm.value.joinLockOffsetMinutes,
          preferences: normalizeComma(prForm.value.preferencesText),
          notes: prForm.value.notes.trim() || null,
        },
      });
    }
    if (selectedPR.value && prForm.value.status !== selectedPR.value.status) {
      await updatePRStatusMutation.mutateAsync({
        prId: selectedPRId.value,
        input: { status: prForm.value.status },
      });
    }
    if (
      selectedPR.value &&
      prForm.value.visibilityStatus !== selectedPR.value.visibilityStatus
    ) {
      await updatePRVisibilityMutation.mutateAsync({
        prId: selectedPRId.value,
        input: { visibilityStatus: prForm.value.visibilityStatus },
      });
    }
  } catch {
    // Mutation state already drives the page-level error toast.
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

.selection-list--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-spacing-sm);
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

.inset {
  padding: var(--sys-spacing-med);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface);
}

@media (min-width: 880px) {
  .grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
