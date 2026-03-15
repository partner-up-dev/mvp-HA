<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">{{ t("adminAnchorPR.eventsTitle") }}</h2>
              <button class="secondary-btn" type="button" @click="prepareNewEvent">{{ t("adminAnchorPR.newEventAction") }}</button>
            </div>
            <div v-if="events.length === 0" class="hint">{{ t("adminAnchorPR.emptyEvents") }}</div>
            <div v-else class="selection-list">
              <button
                v-for="event in events"
                :key="event.id"
                class="selection-btn"
                :class="{ 'selection-btn--active': !isCreatingEvent && selectedEventId === event.id }"
                type="button"
                @click="selectEvent(event.id)"
              >
                <span>{{ event.title }}</span>
                <small>{{ event.status }}</small>
              </button>
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
      <LoadingIndicator v-if="workspaceQuery.isLoading.value" :message="t('common.loading')" />
      <ErrorToast v-else-if="workspaceQuery.error.value" :message="workspaceQuery.error.value.message" persistent />

      <template v-else>
        <div class="grid-2">
          <section class="panel">
            <div class="stack">
              <h2 class="card-title">{{ t("adminAnchorPR.eventFormTitle") }}</h2>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.eventNameLabel") }}</span><input v-model="eventForm.title" class="field-input" /></label>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.eventTypeLabel") }}</span><input v-model="eventForm.type" class="field-input" /></label>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.eventDescriptionLabel") }}</span><textarea v-model="eventForm.description" class="field-input field-textarea"></textarea></label>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.eventCoverImageLabel") }}</span><input v-model="eventForm.coverImage" class="field-input" /></label>
              <label class="field">
                <span class="field-label">{{ t("adminAnchorPR.eventStatusLabel") }}</span>
                <select v-model="eventForm.status" class="field-input">
                  <option value="ACTIVE">{{ t("adminAnchorPR.statusActive") }}</option>
                  <option value="PAUSED">{{ t("adminAnchorPR.statusPaused") }}</option>
                  <option value="ARCHIVED">{{ t("adminAnchorPR.statusArchived") }}</option>
                </select>
              </label>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.eventLocationPoolLabel") }}</span><textarea v-model="eventForm.locationPoolText" class="field-input field-textarea"></textarea></label>
              <p class="hint">{{ t("adminAnchorPR.eventTimeWindowHint") }}</p>
              <button class="primary-btn" type="button" :disabled="createEventMutation.isPending.value || updateEventMutation.isPending.value" @click="handleSaveEvent">
                {{ (createEventMutation.isPending.value || updateEventMutation.isPending.value) ? t("adminAnchorPR.saving") : (isCreatingEvent ? t("adminAnchorPR.createEventAction") : t("adminAnchorPR.saveEventAction")) }}
              </button>
            </div>
          </section>

          <section class="panel">
            <div class="stack">
              <div class="section-header">
                <h2 class="card-title">{{ t("adminAnchorPR.batchesTitle") }}</h2>
                <button class="secondary-btn" type="button" :disabled="selectedEventId === null" @click="prepareNewBatch">{{ t("adminAnchorPR.newBatchAction") }}</button>
              </div>
              <div v-if="selectedEvent === null" class="hint">{{ t("adminAnchorPR.emptyEvents") }}</div>
              <div v-else-if="selectedEvent.batches.length === 0" class="hint">{{ t("adminAnchorPR.emptyBatches") }}</div>
              <div v-else class="selection-list">
                <button
                  v-for="batch in selectedEvent.batches"
                  :key="batch.id"
                  class="selection-btn"
                  :class="{ 'selection-btn--active': !isCreatingBatch && selectedBatchId === batch.id }"
                  type="button"
                  @click="selectBatch(batch.id)"
                >
                  <span>{{ formatWindow(batch.timeWindow) }}</span>
                  <small>{{ batch.status }}</small>
                </button>
              </div>
              <div v-if="selectedEvent !== null" class="stack inset">
                <h3 class="card-title">{{ t("adminAnchorPR.batchFormTitle") }}</h3>
                <label class="field"><span class="field-label">{{ t("adminAnchorPR.batchStartLabel") }}</span><input v-model="batchForm.start" class="field-input" /></label>
                <label class="field"><span class="field-label">{{ t("adminAnchorPR.batchEndLabel") }}</span><input v-model="batchForm.end" class="field-input" /></label>
                <label class="field">
                  <span class="field-label">{{ t("adminAnchorPR.batchStatusLabel") }}</span>
                  <select v-model="batchForm.status" class="field-input">
                    <option value="OPEN">{{ t("adminAnchorPR.batchStatusOpen") }}</option>
                    <option value="FULL">{{ t("adminAnchorPR.batchStatusFull") }}</option>
                    <option value="EXPIRED">{{ t("adminAnchorPR.batchStatusExpired") }}</option>
                  </select>
                </label>
                <button class="primary-btn" type="button" :disabled="createBatchMutation.isPending.value || updateBatchMutation.isPending.value" @click="handleSaveBatch">
                  {{ (createBatchMutation.isPending.value || updateBatchMutation.isPending.value) ? t("adminAnchorPR.saving") : (isCreatingBatch ? t("adminAnchorPR.createBatchAction") : t("adminAnchorPR.saveBatchAction")) }}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">{{ t("adminAnchorPR.anchorPRsTitle") }}</h2>
              <button class="secondary-btn" type="button" :disabled="selectedBatch === null || selectedEvent === null" @click="prepareNewPR">{{ t("adminAnchorPR.newAnchorPRAction") }}</button>
            </div>

            <div v-if="selectedBatch === null" class="hint">{{ t("adminAnchorPR.emptyBatches") }}</div>
            <div v-else-if="selectedBatch.prs.length === 0" class="hint">{{ t("adminAnchorPR.emptyAnchorPRs") }}</div>
            <div v-else class="selection-list selection-list--grid">
              <button
                v-for="pr in selectedBatch.prs"
                :key="pr.prId"
                class="selection-btn"
                :class="{ 'selection-btn--active': !isCreatingPR && selectedPRId === pr.prId }"
                type="button"
                @click="selectPR(pr.prId)"
              >
                <span>{{ pr.title || pr.location || `#${pr.prId}` }}</span>
                <small>{{ pr.status }} / {{ pr.visibilityStatus }}</small>
                <small>{{ t("adminAnchorPR.partnerCountWithValue", { count: pr.partnerCount }) }}</small>
              </button>
            </div>

            <div v-if="selectedBatch !== null && selectedEvent !== null" class="stack inset">
              <h3 class="card-title">{{ t("adminAnchorPR.anchorPRFormTitle") }}</h3>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.anchorPRTitleLabel") }}</span><input v-model="prForm.title" class="field-input" :disabled="!canEditPRContent" /></label>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.anchorPRTypeLabel") }}</span><input v-model="prForm.type" class="field-input" :disabled="!canEditPRContent" /></label>
              <label class="field">
                <span class="field-label">{{ t("adminAnchorPR.anchorPRLocationLabel") }}</span>
                <select v-model="prForm.location" class="field-input" :disabled="!canEditPRContent || !hasLocationOptions">
                  <option v-if="!hasLocationOptions" value="">{{ t("adminAnchorPR.noLocationOption") }}</option>
                  <option v-for="location in selectedEvent.locationPool" :key="location" :value="location">{{ location }}</option>
                </select>
              </label>
              <div class="grid-2">
                <label class="field"><span class="field-label">{{ t("adminAnchorPR.anchorPRMinPartnersLabel") }}</span><input v-model.number="prForm.minPartners" class="field-input" type="number" :disabled="!canEditPRContent" /></label>
                <label class="field"><span class="field-label">{{ t("adminAnchorPR.anchorPRMaxPartnersLabel") }}</span><input v-model.number="prForm.maxPartners" class="field-input" type="number" :disabled="!canEditPRContent" /></label>
              </div>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.anchorPRPreferencesLabel") }}</span><input v-model="prForm.preferencesText" class="field-input" :disabled="!canEditPRContent" /></label>
              <label class="field"><span class="field-label">{{ t("adminAnchorPR.anchorPRNotesLabel") }}</span><textarea v-model="prForm.notes" class="field-input field-textarea" :disabled="!canEditPRContent"></textarea></label>
              <label class="field">
                <span class="field-label">{{ t("adminAnchorPR.anchorPRStatusLabel") }}</span>
                <select v-model="prForm.status" class="field-input">
                  <option value="OPEN">OPEN</option>
                  <option value="READY">READY</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </label>
              <label class="field">
                <span class="field-label">{{ t("adminAnchorPR.anchorPRVisibilityLabel") }}</span>
                <select v-model="prForm.visibilityStatus" class="field-input">
                  <option value="VISIBLE">{{ t("adminAnchorPR.visibilityVisible") }}</option>
                  <option value="HIDDEN">{{ t("adminAnchorPR.visibilityHidden") }}</option>
                </select>
              </label>
              <p v-if="!hasLocationOptions" class="hint">{{ t("adminAnchorPR.anchorPRLocationHint") }}</p>
              <p class="hint">{{ t("adminAnchorPR.anchorPRTimeHint") }}</p>
              <p v-if="!canEditPRContent" class="hint">{{ t("adminAnchorPR.anchorPRContentLockedHint") }}</p>
              <button class="primary-btn" type="button" :disabled="isSavingPR || (isCreatingPR && !hasLocationOptions)" @click="handleSavePR">
                {{ isSavingPR ? t("adminAnchorPR.saving") : (isCreatingPR ? t("adminAnchorPR.createAnchorPRAction") : t("adminAnchorPR.saveAnchorPRAction")) }}
              </button>
            </div>
          </div>
        </section>
      </template>
    </div>
  </DesktopPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminNavigationCard from "@/domains/admin/ui/composites/AdminNavigationCard.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
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
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";

type Workspace = NonNullable<AdminAnchorWorkspaceResponse>;
type EventRecord = Workspace["events"][number];
type BatchRecord = EventRecord["batches"][number];
type PRRecord = BatchRecord["prs"][number];
type EventForm = { title: string; type: string; description: string; coverImage: string; status: "ACTIVE" | "PAUSED" | "ARCHIVED"; locationPoolText: string };
type BatchForm = { start: string; end: string; status: "OPEN" | "FULL" | "EXPIRED" };
type PRForm = { title: string; type: string; location: string; minPartners: number | null; maxPartners: number | null; preferencesText: string; notes: string; status: "OPEN" | "READY" | "ACTIVE" | "CLOSED"; visibilityStatus: "VISIBLE" | "HIDDEN" };

const emptyEventForm = (): EventForm => ({ title: "", type: "", description: "", coverImage: "", status: "ACTIVE", locationPoolText: "" });
const emptyBatchForm = (): BatchForm => ({ start: "", end: "", status: "OPEN" });
const emptyPRForm = (location = "", type = ""): PRForm => ({ title: "", type, location, minPartners: null, maxPartners: null, preferencesText: "", notes: "", status: "OPEN", visibilityStatus: "VISIBLE" });
const toEventForm = (event: EventRecord): EventForm => ({ title: event.title, type: event.type, description: event.description ?? "", coverImage: event.coverImage ?? "", status: event.status as EventForm["status"], locationPoolText: event.locationPool.join("\n") });
const toBatchForm = (batch: BatchRecord): BatchForm => ({ start: batch.timeWindow[0] ?? "", end: batch.timeWindow[1] ?? "", status: batch.status as BatchForm["status"] });
const toPRForm = (pr: PRRecord): PRForm => ({
  title: pr.title ?? "",
  type: pr.type,
  location: pr.location ?? "",
  minPartners: pr.minPartners,
  maxPartners: pr.maxPartners,
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
const workspace = computed<Workspace | null>(() => workspaceQuery.data.value ?? null);
const events = computed<EventRecord[]>(() => workspace.value?.events ?? []);
const selectedEventId = computed<number | null>(() => { const parsed = Number(selectedEventIdRaw.value); return Number.isFinite(parsed) && parsed > 0 ? parsed : null; });
const selectedEvent = computed<EventRecord | null>(() => events.value.find((event) => event.id === selectedEventId.value) ?? null);
const selectedBatchId = computed<number | null>(() => { const parsed = Number(selectedBatchIdRaw.value); return Number.isFinite(parsed) && parsed > 0 ? parsed : null; });
const selectedBatch = computed<BatchRecord | null>(() => selectedEvent.value?.batches.find((batch) => batch.id === selectedBatchId.value) ?? null);
const selectedPRId = computed<number | null>(() => { const parsed = Number(selectedPRIdRaw.value); return Number.isFinite(parsed) && parsed > 0 ? parsed : null; });
const selectedPR = computed<PRRecord | null>(() => selectedBatch.value?.prs.find((pr) => pr.prId === selectedPRId.value) ?? null);
const canEditPRContent = computed(() => isCreatingPR.value || selectedPR.value?.status === "OPEN");
const hasLocationOptions = computed(() => (selectedEvent.value?.locationPool.length ?? 0) > 0);
const isSavingPR = computed(() => createPRMutation.isPending.value || updatePRContentMutation.isPending.value || updatePRStatusMutation.isPending.value || updatePRVisibilityMutation.isPending.value);
const normalizeLines = (value: string): string[] => value.split("\n").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
const normalizeComma = (value: string): string[] => value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
const formatWindow = (windowValue: [string | null, string | null]) =>
  formatLocalDateTimeWindowLabel(windowValue, {}, "?");

watch([events, isAdmin, isCreatingEvent], ([nextEvents, adminReady, creating]) => {
  if (!adminReady || creating || nextEvents.length === 0) { if (!adminReady || nextEvents.length === 0) selectedEventIdRaw.value = ""; return; }
  if (!nextEvents.some((event) => String(event.id) === selectedEventIdRaw.value)) selectedEventIdRaw.value = String(nextEvents[0].id);
}, { immediate: true });
watch([selectedEvent, isCreatingEvent], ([event, creating]) => {
  if (creating) { eventForm.value = emptyEventForm(); selectedBatchIdRaw.value = ""; selectedPRIdRaw.value = ""; batchForm.value = emptyBatchForm(); prForm.value = emptyPRForm(); return; }
  if (!event) { eventForm.value = emptyEventForm(); selectedBatchIdRaw.value = ""; selectedPRIdRaw.value = ""; batchForm.value = emptyBatchForm(); prForm.value = emptyPRForm(); return; }
  eventForm.value = toEventForm(event);
  if (!event.batches.some((batch) => String(batch.id) === selectedBatchIdRaw.value)) selectedBatchIdRaw.value = event.batches[0] ? String(event.batches[0].id) : "";
}, { immediate: true });
watch([selectedBatch, isCreatingBatch, selectedEvent], ([batch, creating, event]) => {
  if (creating) { batchForm.value = emptyBatchForm(); selectedPRIdRaw.value = ""; prForm.value = emptyPRForm(event?.locationPool[0] ?? "", event?.type ?? ""); return; }
  if (!batch || !event) { batchForm.value = emptyBatchForm(); selectedPRIdRaw.value = ""; prForm.value = emptyPRForm(event?.locationPool[0] ?? "", event?.type ?? ""); return; }
  batchForm.value = toBatchForm(batch);
  if (!batch.prs.some((pr) => String(pr.prId) === selectedPRIdRaw.value)) selectedPRIdRaw.value = batch.prs[0] ? String(batch.prs[0].prId) : "";
}, { immediate: true });
watch([selectedPR, isCreatingPR, selectedEvent], ([pr, creating, event]) => {
  if (creating) { prForm.value = emptyPRForm(event?.locationPool[0] ?? "", event?.type ?? ""); return; }
  if (!pr || !event) { prForm.value = emptyPRForm(event?.locationPool[0] ?? "", event?.type ?? ""); return; }
  prForm.value = { ...toPRForm(pr), location: pr.location ?? event.locationPool[0] ?? "", type: pr.type };
}, { immediate: true });

const prepareNewEvent = () => { isCreatingEvent.value = true; isCreatingBatch.value = false; isCreatingPR.value = false; selectedEventIdRaw.value = ""; selectedBatchIdRaw.value = ""; selectedPRIdRaw.value = ""; eventForm.value = emptyEventForm(); batchForm.value = emptyBatchForm(); prForm.value = emptyPRForm(); };
const selectEvent = (eventId: number) => { isCreatingEvent.value = false; isCreatingBatch.value = false; isCreatingPR.value = false; selectedEventIdRaw.value = String(eventId); };
const prepareNewBatch = () => { if (!selectedEvent.value) return; isCreatingBatch.value = true; isCreatingPR.value = false; selectedBatchIdRaw.value = ""; selectedPRIdRaw.value = ""; batchForm.value = emptyBatchForm(); prForm.value = emptyPRForm(selectedEvent.value.locationPool[0] ?? "", selectedEvent.value.type); };
const selectBatch = (batchId: number) => { isCreatingBatch.value = false; isCreatingPR.value = false; selectedBatchIdRaw.value = String(batchId); };
const prepareNewPR = () => { if (!selectedEvent.value || selectedBatchId.value === null) return; isCreatingPR.value = true; selectedPRIdRaw.value = ""; prForm.value = emptyPRForm(selectedEvent.value.locationPool[0] ?? "", selectedEvent.value.type); };
const selectPR = (prId: number) => { isCreatingPR.value = false; selectedPRIdRaw.value = String(prId); };

const handleSaveEvent = async () => {
  const input = { title: eventForm.value.title.trim(), type: eventForm.value.type.trim(), description: eventForm.value.description.trim() || null, locationPool: normalizeLines(eventForm.value.locationPoolText), coverImage: eventForm.value.coverImage.trim() || null, status: eventForm.value.status };
  const result = isCreatingEvent.value || selectedEventId.value === null
    ? await createEventMutation.mutateAsync(input)
    : await updateEventMutation.mutateAsync({ eventId: selectedEventId.value, input });
  isCreatingEvent.value = false;
  selectedEventIdRaw.value = String(result.id);
};
const handleSaveBatch = async () => {
  if (selectedEventId.value === null) return;
  const input = { timeWindow: [batchForm.value.start.trim() || null, batchForm.value.end.trim() || null] as [string | null, string | null], status: batchForm.value.status };
  const result = isCreatingBatch.value || selectedBatchId.value === null
    ? await createBatchMutation.mutateAsync({ eventId: selectedEventId.value, input })
    : await updateBatchMutation.mutateAsync({ batchId: selectedBatchId.value, input });
  isCreatingBatch.value = false;
  selectedBatchIdRaw.value = String(result.id);
};
const handleSavePR = async () => {
  if (!selectedEvent.value || !hasLocationOptions.value || selectedBatchId.value === null) return;
  if (isCreatingPR.value || selectedPRId.value === null || selectedBatch.value === null) {
    const result = await createPRMutation.mutateAsync({
      batchId: selectedBatchId.value,
      input: {
        title: prForm.value.title.trim() || null,
        type: prForm.value.type.trim() || null,
        location: prForm.value.location,
        minPartners: prForm.value.minPartners,
        maxPartners: prForm.value.maxPartners,
        preferences: normalizeComma(prForm.value.preferencesText),
        notes: prForm.value.notes.trim() || null,
      },
    });
    isCreatingPR.value = false;
    selectedPRIdRaw.value = String(result.root.id);
    return;
  }
  if (canEditPRContent.value) {
    await updatePRContentMutation.mutateAsync({
      prId: selectedPRId.value,
      input: {
        title: prForm.value.title.trim() || null,
        type: prForm.value.type.trim(),
        location: prForm.value.location,
        minPartners: prForm.value.minPartners,
        maxPartners: prForm.value.maxPartners,
        preferences: normalizeComma(prForm.value.preferencesText),
        notes: prForm.value.notes.trim() || null,
      },
    });
  }
  if (selectedPR.value && prForm.value.status !== selectedPR.value.status) {
    await updatePRStatusMutation.mutateAsync({ prId: selectedPRId.value, input: { status: prForm.value.status } });
  }
  if (selectedPR.value && prForm.value.visibilityStatus !== selectedPR.value.visibilityStatus) {
    await updatePRVisibilityMutation.mutateAsync({ prId: selectedPRId.value, input: { visibilityStatus: prForm.value.visibilityStatus } });
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
  @include mx.pu-surface-panel(admin-workspace);
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.selection-btn {
  @include mx.pu-selection-card(default);
  cursor: pointer;
}

.selection-btn--active {
  @include mx.pu-selection-card(active);
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
  @include mx.pu-field-shell(compact-surface);
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
  @include mx.pu-surface-panel(subtle-inset);
}

.primary-btn,
.secondary-btn {
  @include mx.pu-font(label-medium);
  cursor: pointer;
}

.primary-btn {
  @include mx.pu-pill-action(solid-primary, small);
  border: none;
}

.secondary-btn {
  @include mx.pu-pill-action(outline-transparent, small);
}

@media (min-width: 880px) {
  .grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
