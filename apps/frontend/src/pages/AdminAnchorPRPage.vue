<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">{{ t("adminAnchorPR.eventsTitle") }}</h2>
              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                @click="prepareNewEvent"
              >
                {{ t("adminAnchorPR.newEventAction") }}
              </Button>
            </div>
            <div v-if="events.length === 0" class="hint">
              {{ t("adminAnchorPR.emptyEvents") }}
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
        <h1 class="title">{{ t("adminAnchorPR.title") }}</h1>
        <p class="subtitle">{{ t("adminAnchorPR.subtitle") }}</p>
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
                {{ t("adminAnchorPR.eventFormTitle") }}
              </h2>
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.eventNameLabel")
                }}</span
                ><input v-model="eventForm.title" class="field-input"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.eventTypeLabel")
                }}</span
                ><input v-model="eventForm.type" class="field-input"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.eventDescriptionLabel")
                }}</span
                ><textarea
                  v-model="eventForm.description"
                  class="field-input field-textarea"
                ></textarea>
              </label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.eventCoverImageLabel")
                }}</span
                ><input v-model="eventForm.coverImage" class="field-input"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.eventBetaGroupQrCodeLabel")
                }}</span
                ><input v-model="eventForm.betaGroupQrCode" class="field-input"
              /></label>
              <label class="field">
                <span class="field-label">{{
                  t("adminAnchorPR.eventStatusLabel")
                }}</span>
                <select v-model="eventForm.status" class="field-input">
                  <option value="ACTIVE">
                    {{ t("adminAnchorPR.statusActive") }}
                  </option>
                  <option value="PAUSED">
                    {{ t("adminAnchorPR.statusPaused") }}
                  </option>
                  <option value="ARCHIVED">
                    {{ t("adminAnchorPR.statusArchived") }}
                  </option>
                </select>
              </label>
              <div class="grid-2">
                <label class="field">
                  <span class="field-label">{{
                    t("adminAnchorPR.eventDefaultMinPartnersLabel")
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
                    t("adminAnchorPR.eventDefaultMaxPartnersLabel")
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
                  t("adminAnchorPR.eventLocationPoolLabel")
                }}</span
                ><textarea
                  v-model="eventForm.systemLocationPoolText"
                  class="field-input field-textarea"
                ></textarea>
              </label>
              <label class="field">
                <span class="field-label"
                  >用户可创建地点池（每行: 地点ID,上限）</span
                >
                <textarea
                  v-model="eventForm.userLocationPoolText"
                  class="field-input field-textarea"
                ></textarea>
              </label>
              <p class="hint">{{ t("adminAnchorPR.eventPoiHint") }}</p>
              <p class="hint">{{ t("adminAnchorPR.eventTimeWindowHint") }}</p>
              <Button
                appearance="pill"
                size="sm"
                type="button"
                :disabled="
                  createEventMutation.isPending.value ||
                  updateEventMutation.isPending.value ||
                  Boolean(eventBoundsValidationMessage)
                "
                @click="handleSaveEvent"
              >
                {{
                  createEventMutation.isPending.value ||
                  updateEventMutation.isPending.value
                    ? t("adminAnchorPR.saving")
                    : isCreatingEvent
                      ? t("adminAnchorPR.createEventAction")
                      : t("adminAnchorPR.saveEventAction")
                }}
              </Button>
            </div>
          </section>

          <section class="panel">
            <div class="stack">
              <div class="section-header">
                <h2 class="card-title">
                  {{ t("adminAnchorPR.batchesTitle") }}
                </h2>
                <Button
                  appearance="pill"
                  tone="outline"
                  size="sm"
                  type="button"
                  :disabled="selectedEventId === null"
                  @click="prepareNewBatch"
                >
                  {{ t("adminAnchorPR.newBatchAction") }}
                </Button>
              </div>
              <div v-if="selectedEvent === null" class="hint">
                {{ t("adminAnchorPR.emptyEvents") }}
              </div>
              <div v-else-if="selectedEvent.batches.length === 0" class="hint">
                {{ t("adminAnchorPR.emptyBatches") }}
              </div>
              <div v-else class="selection-list">
                <ChoiceCard
                  v-for="batch in selectedEvent.batches"
                  :key="batch.id"
                  class="selection-btn"
                  :active="!isCreatingBatch && selectedBatchId === batch.id"
                  @click="selectBatch(batch.id)"
                >
                  <span>{{ formatWindow(batch.timeWindow) }}</span>
                  <small v-if="batch.description">{{
                    batch.description
                  }}</small>
                  <small>{{ batch.status }}</small>
                </ChoiceCard>
              </div>
              <div v-if="selectedEvent !== null" class="stack inset">
                <h3 class="card-title">
                  {{ t("adminAnchorPR.batchFormTitle") }}
                </h3>
                <label class="field"
                  ><span class="field-label">{{
                    t("adminAnchorPR.batchStartLabel")
                  }}</span
                  ><input v-model="batchForm.start" class="field-input"
                /></label>
                <label class="field"
                  ><span class="field-label">{{
                    t("adminAnchorPR.batchEndLabel")
                  }}</span
                  ><input v-model="batchForm.end" class="field-input"
                /></label>
                <label class="field"
                  ><span class="field-label">{{
                    t("adminAnchorPR.batchDescriptionLabel")
                  }}</span
                  ><textarea
                    v-model="batchForm.description"
                    class="field-input field-textarea"
                  ></textarea>
                </label>
                <label class="field">
                  <span class="field-label">最早提前時間（分鐘）</span>
                  <input
                    v-model.number="batchForm.earliestLeadMinutes"
                    class="field-input"
                    type="number"
                    min="0"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminAnchorPR.batchStatusLabel")
                  }}</span>
                  <select v-model="batchForm.status" class="field-input">
                    <option value="OPEN">
                      {{ t("adminAnchorPR.batchStatusOpen") }}
                    </option>
                    <option value="FULL">
                      {{ t("adminAnchorPR.batchStatusFull") }}
                    </option>
                    <option value="EXPIRED">
                      {{ t("adminAnchorPR.batchStatusExpired") }}
                    </option>
                  </select>
                </label>
                <Button
                  appearance="pill"
                  size="sm"
                  type="button"
                  :disabled="
                    createBatchMutation.isPending.value ||
                    updateBatchMutation.isPending.value
                  "
                  @click="handleSaveBatch"
                >
                  {{
                    createBatchMutation.isPending.value ||
                    updateBatchMutation.isPending.value
                      ? t("adminAnchorPR.saving")
                      : isCreatingBatch
                        ? t("adminAnchorPR.createBatchAction")
                        : t("adminAnchorPR.saveBatchAction")
                  }}
                </Button>
              </div>
            </div>
          </section>
        </div>

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">
                {{ t("adminAnchorPR.anchorPRsTitle") }}
              </h2>
              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                :disabled="selectedBatch === null || selectedEvent === null"
                @click="prepareNewPR"
              >
                {{ t("adminAnchorPR.newAnchorPRAction") }}
              </Button>
            </div>

            <div v-if="selectedBatch === null" class="hint">
              {{ t("adminAnchorPR.emptyBatches") }}
            </div>
            <div v-else-if="selectedBatch.prs.length === 0" class="hint">
              {{ t("adminAnchorPR.emptyAnchorPRs") }}
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
                  t("adminAnchorPR.partnerCountWithValue", {
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
                {{ t("adminAnchorPR.anchorPRFormTitle") }}
              </h3>
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.anchorPRTitleLabel")
                }}</span
                ><input
                  v-model="prForm.title"
                  class="field-input"
                  :disabled="!canEditPRContent"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.anchorPRTypeLabel")
                }}</span
                ><input
                  v-model="prForm.type"
                  class="field-input"
                  :disabled="!canEditPRContent"
              /></label>
              <label class="field">
                <span class="field-label">{{
                  t("adminAnchorPR.anchorPRLocationLabel")
                }}</span>
                <select
                  v-model="prForm.location"
                  class="field-input"
                  :disabled="!canEditPRContent || !hasLocationOptions"
                >
                  <option v-if="!hasLocationOptions" value="">
                    {{ t("adminAnchorPR.noLocationOption") }}
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
                    t("adminAnchorPR.anchorPRMinPartnersLabel")
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
                    t("adminAnchorPR.anchorPRMaxPartnersLabel")
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
                :title="t('adminAnchorPR.participationPolicyTitle')"
                :description="t('adminAnchorPR.participationPolicyDescription')"
                :event-start-at="selectedBatch.timeWindow[0]"
                :booking-deadline-at="
                  selectedPR?.effectiveBookingDeadlineAt ?? null
                "
                :disabled="!canEditPRContent"
                :validation-message="policyValidationMessage"
              />
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.anchorPRPreferencesLabel")
                }}</span
                ><input
                  v-model="prForm.preferencesText"
                  class="field-input"
                  :disabled="!canEditPRContent"
              /></label>
              <label class="field"
                ><span class="field-label">{{
                  t("adminAnchorPR.anchorPRNotesLabel")
                }}</span
                ><textarea
                  v-model="prForm.notes"
                  class="field-input field-textarea"
                  :disabled="!canEditPRContent"
                ></textarea>
              </label>
              <label class="field">
                <span class="field-label">{{
                  t("adminAnchorPR.anchorPRStatusLabel")
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
                  t("adminAnchorPR.anchorPRVisibilityLabel")
                }}</span>
                <select v-model="prForm.visibilityStatus" class="field-input">
                  <option value="VISIBLE">
                    {{ t("adminAnchorPR.visibilityVisible") }}
                  </option>
                  <option value="HIDDEN">
                    {{ t("adminAnchorPR.visibilityHidden") }}
                  </option>
                </select>
              </label>
              <p v-if="!hasLocationOptions" class="hint">
                {{ t("adminAnchorPR.anchorPRLocationHint") }}
              </p>
              <p class="hint">{{ t("adminAnchorPR.anchorPRTimeHint") }}</p>
              <p v-if="policyRecommendationMessage" class="hint">
                {{ policyRecommendationMessage }}
              </p>
              <p v-if="selectedPR?.bookingTriggeredAt" class="hint">
                {{
                  t("adminAnchorPR.bookingTriggeredAtLabel", {
                    dateTime: formatDateTime(selectedPR.bookingTriggeredAt),
                  })
                }}
              </p>
              <p v-if="!canEditPRContent" class="hint">
                {{ t("adminAnchorPR.anchorPRContentLockedHint") }}
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
                    ? t("adminAnchorPR.saving")
                    : isCreatingPR
                      ? t("adminAnchorPR.createAnchorPRAction")
                      : t("adminAnchorPR.saveAnchorPRAction")
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
  useAdminAnchorWorkspace,
  useCreateAdminAnchorEvent,
  useCreateAdminAnchorBatch,
  useCreateAdminAnchorPR,
  useUpdateAdminAnchorEvent,
  useUpdateAdminAnchorBatch,
  useUpdateAdminAnchorPRContent,
  useUpdateAdminAnchorPRStatus,
  useUpdateAdminAnchorPRVisibility,
  type AdminAnchorWorkspaceResponse,
} from "@/domains/admin/queries/useAdminAnchorManagement";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";
import {
  formatLocalDateTimeValue,
  formatLocalDateTimeWindowLabel,
} from "@/shared/datetime/formatLocalDateTime";
import TimelinePolicyPicker from "@/shared/ui/forms/TimelinePolicyPicker.vue";
import { validateManualPartnerBounds } from "@/lib/validation";

type Workspace = NonNullable<AdminAnchorWorkspaceResponse>;
type EventRecord = Workspace["events"][number];
type BatchRecord = EventRecord["batches"][number];
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
};
type BatchForm = {
  start: string;
  end: string;
  description: string;
  earliestLeadMinutes: number | null;
  status: "OPEN" | "FULL" | "EXPIRED";
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
});
const emptyBatchForm = (): BatchForm => ({
  start: "",
  end: "",
  description: "",
  earliestLeadMinutes: null,
  status: "OPEN",
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
});
const toBatchForm = (batch: BatchRecord): BatchForm => ({
  start: batch.timeWindow[0] ?? "",
  end: batch.timeWindow[1] ?? "",
  description: batch.description ?? "",
  earliestLeadMinutes: batch.earliestLeadMinutes ?? null,
  status: batch.status as BatchForm["status"],
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
const workspaceQuery = useAdminAnchorWorkspace(isAdmin);
const createEventMutation = useCreateAdminAnchorEvent();
const updateEventMutation = useUpdateAdminAnchorEvent();
const createBatchMutation = useCreateAdminAnchorBatch();
const updateBatchMutation = useUpdateAdminAnchorBatch();
const createPRMutation = useCreateAdminAnchorPR();
const updatePRContentMutation = useUpdateAdminAnchorPRContent();
const updatePRStatusMutation = useUpdateAdminAnchorPRStatus();
const updatePRVisibilityMutation = useUpdateAdminAnchorPRVisibility();
const selectedEventIdRaw = ref("");
const selectedBatchIdRaw = ref("");
const selectedPRIdRaw = ref("");
const isCreatingEvent = ref(false);
const isCreatingBatch = ref(false);
const isCreatingPR = ref(false);
const eventForm = ref<EventForm>(emptyEventForm());
const batchForm = ref<BatchForm>(emptyBatchForm());
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
const selectedBatchId = computed<number | null>(() => {
  const parsed = Number(selectedBatchIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});
const selectedBatch = computed<BatchRecord | null>(
  () =>
    selectedEvent.value?.batches.find(
      (batch) => batch.id === selectedBatchId.value,
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
const mutationErrorMessage = computed(
  () =>
    createEventMutation.error.value?.message ||
    updateEventMutation.error.value?.message ||
    createBatchMutation.error.value?.message ||
    updateBatchMutation.error.value?.message ||
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
    return t("adminAnchorPR.policyValidationStartBeforeEnd");
  }

  if (
    prForm.value.joinLockOffsetMinutes <
    prForm.value.confirmationEndOffsetMinutes
  ) {
    return t("adminAnchorPR.policyValidationJoinLockAfterConfirmationEnd");
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
      return t("adminAnchorPR.policyValidationDeadlineAfterConfirmationEnd");
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
      batchForm.value = emptyBatchForm();
      prForm.value = emptyPRForm();
      return;
    }
    if (!event) {
      eventForm.value = emptyEventForm();
      selectedBatchIdRaw.value = "";
      selectedPRIdRaw.value = "";
      batchForm.value = emptyBatchForm();
      prForm.value = emptyPRForm();
      return;
    }
    eventForm.value = toEventForm(event);
    if (
      !event.batches.some(
        (batch) => String(batch.id) === selectedBatchIdRaw.value,
      )
    )
      selectedBatchIdRaw.value = event.batches[0]
        ? String(event.batches[0].id)
        : "";
  },
  { immediate: true },
);
watch(
  [selectedBatch, isCreatingBatch, selectedEvent],
  ([batch, creating, event]) => {
    if (creating) {
      batchForm.value = emptyBatchForm();
      selectedPRIdRaw.value = "";
      prForm.value = emptyPRForm(
        firstEventLocation(event),
        event?.type ?? "",
        resolveDefaultMinPartners(event?.defaultMinPartners),
      );
      return;
    }
    if (!batch || !event) {
      batchForm.value = emptyBatchForm();
      selectedPRIdRaw.value = "";
      prForm.value = emptyPRForm(
        firstEventLocation(event),
        event?.type ?? "",
        resolveDefaultMinPartners(event?.defaultMinPartners),
      );
      return;
    }
    batchForm.value = toBatchForm(batch);
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
  isCreatingBatch.value = false;
  isCreatingPR.value = false;
  selectedEventIdRaw.value = "";
  selectedBatchIdRaw.value = "";
  selectedPRIdRaw.value = "";
  eventForm.value = emptyEventForm();
  batchForm.value = emptyBatchForm();
  prForm.value = emptyPRForm();
};
const selectEvent = (eventId: number) => {
  isCreatingEvent.value = false;
  isCreatingBatch.value = false;
  isCreatingPR.value = false;
  selectedEventIdRaw.value = String(eventId);
};
const prepareNewBatch = () => {
  if (!selectedEvent.value) return;
  isCreatingBatch.value = true;
  isCreatingPR.value = false;
  selectedBatchIdRaw.value = "";
  selectedPRIdRaw.value = "";
  batchForm.value = emptyBatchForm();
  prForm.value = emptyPRForm(
    firstEventLocation(selectedEvent.value),
    selectedEvent.value.type,
    resolveDefaultMinPartners(selectedEvent.value.defaultMinPartners),
  );
};
const selectBatch = (batchId: number) => {
  isCreatingBatch.value = false;
  isCreatingPR.value = false;
  selectedBatchIdRaw.value = String(batchId);
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
  createBatchMutation.reset();
  updateBatchMutation.reset();
  createPRMutation.reset();
  updatePRContentMutation.reset();
  updatePRStatusMutation.reset();
  updatePRVisibilityMutation.reset();
};

const handleSaveEvent = async () => {
  if (eventBoundsValidationMessage.value) return;
  const input = {
    title: eventForm.value.title.trim(),
    type: eventForm.value.type.trim(),
    description: eventForm.value.description.trim() || null,
    systemLocationPool: normalizeLines(eventForm.value.systemLocationPoolText),
    userLocationPool: normalizeUserLocationLines(
      eventForm.value.userLocationPoolText,
    ),
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
const handleSaveBatch = async () => {
  if (selectedEventId.value === null) return;
  const input = {
    timeWindow: [
      batchForm.value.start.trim() || null,
      batchForm.value.end.trim() || null,
    ] as [string | null, string | null],
    status: batchForm.value.status,
    description: batchForm.value.description.trim() || null,
    earliestLeadMinutes: normalizeNullableNonNegativeInteger(
      batchForm.value.earliestLeadMinutes,
    ),
  };
  try {
    const result =
      isCreatingBatch.value || selectedBatchId.value === null
        ? await createBatchMutation.mutateAsync({
            eventId: selectedEventId.value,
            input,
          })
        : await updateBatchMutation.mutateAsync({
            batchId: selectedBatchId.value,
            input,
          });
    isCreatingBatch.value = false;
    selectedBatchIdRaw.value = String(result.id);
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
        batchId: selectedBatchId.value,
        input: {
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
