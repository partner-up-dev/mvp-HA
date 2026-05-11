<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <h2 class="card-title">{{ t("adminPRMessages.eventsTitle") }}</h2>
            <div v-if="events.length === 0" class="hint">
              {{ t("adminPRMessages.emptyEvents") }}
            </div>
            <div v-else class="selection-list">
              <ChoiceCard
                v-for="event in events"
                :key="event.id"
                class="selection-btn"
                :active="selectedEventId === event.id"
                @click="selectEvent(event.id)"
              >
                <span>{{ event.title }}</span>
                <small>{{ event.status }}</small>
              </ChoiceCard>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="stack">
            <h2 class="card-title">{{ t("adminPRMessages.timeWindowsTitle") }}</h2>
            <div v-if="selectedEvent === null" class="hint">
              {{ t("adminPRMessages.selectEventHint") }}
            </div>
            <div v-else-if="selectedEvent.timeWindows.length === 0" class="hint">
              {{ t("adminPRMessages.emptyTimeWindows") }}
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
                  t("adminPRMessages.generatedPRCount", {
                    count: batch.prs.length,
                  })
                }}</small>
              </ChoiceCard>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #header>
      <header class="header">
        <h1 class="title">{{ t("adminPRMessages.title") }}</h1>
        <p class="subtitle">{{ t("adminPRMessages.subtitle") }}</p>
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
        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">
                {{ t("adminPRMessages.prsTitle") }}
              </h2>
              <p class="hint">
                {{
                  t("adminPRMessages.selectedCount", {
                    count: selectedBatch?.prs.length ?? 0,
                  })
                }}
              </p>
            </div>

            <div v-if="selectedBatch === null" class="hint">
              {{ t("adminPRMessages.selectBatchHint") }}
            </div>
            <div v-else-if="selectedBatch.prs.length === 0" class="hint">
              {{ t("adminPRMessages.emptyPRs") }}
            </div>
            <div v-else class="selection-list selection-list--grid">
              <ChoiceCard
                v-for="pr in selectedBatch.prs"
                :key="pr.prId"
                class="selection-btn"
                :active="selectedPRId === pr.prId"
                @click="selectPR(pr.prId)"
              >
                <span>{{ pr.title || pr.location || `#${pr.prId}` }}</span>
                <small>#{{ pr.prId }} / {{ pr.status }}</small>
                <small>{{
                  t("adminPRMessages.partnerCountWithValue", {
                    count: pr.partnerCount,
                  })
                }}</small>
              </ChoiceCard>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <div class="stack stack--tight">
                <h2 class="card-title">
                  {{ t("adminPRMessages.composerTitle") }}
                </h2>
                <p class="hint">
                  {{ t("adminPRMessages.composerHint") }}
                </p>
              </div>
              <div v-if="selectedPR" class="stack stack--tight stack--align-end">
                <strong>{{ selectedPR.title || selectedPR.location || `#${selectedPR.prId}` }}</strong>
                <span class="hint">#{{ selectedPR.prId }}</span>
              </div>
            </div>

            <div v-if="selectedPR === null" class="empty-state">
              {{ t("adminPRMessages.selectPRHint") }}
            </div>

            <template v-else>
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">{{ t("adminPRMessages.eventLabel") }}</span>
                  <strong>{{ selectedEvent?.title ?? "-" }}</strong>
                </div>
                <div class="meta-item">
                  <span class="meta-label">{{ t("adminPRMessages.batchLabel") }}</span>
                  <strong>{{ selectedBatch ? formatWindow(selectedBatch.timeWindow) : "-" }}</strong>
                </div>
                <div class="meta-item">
                  <span class="meta-label">{{ t("adminPRMessages.locationLabel") }}</span>
                  <strong>{{ selectedPR.location ?? "-" }}</strong>
                </div>
                <div class="meta-item">
                  <span class="meta-label">{{ t("adminPRMessages.statusLabel") }}</span>
                  <strong>{{ selectedPR.status }} / {{ selectedPR.visibilityStatus }}</strong>
                </div>
              </div>

              <label class="field">
                <span class="field-label">{{
                  t("adminPRMessages.messageLabel")
                }}</span>
                <textarea
                  v-model="draftBody"
                  class="field-input field-textarea"
                  :placeholder="t('adminPRMessages.messagePlaceholder')"
                  :disabled="createMessageMutation.isPending.value"
                ></textarea>
              </label>

              <p v-if="submitError" class="error-message">
                {{ submitError }}
              </p>

              <div class="actions">
                <Button
                  appearance="pill"
                  size="sm"
                  type="button"
                  :disabled="
                    createMessageMutation.isPending.value ||
                    draftBody.trim().length === 0
                  "
                  @click="handleSendSystemMessage"
                >
                  {{
                    createMessageMutation.isPending.value
                      ? t("adminPRMessages.messageSending")
                      : t("adminPRMessages.messageAction")
                  }}
                </Button>
              </div>
            </template>
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
import {
  type AdminAnchorEventWorkspaceResponse,
  useAdminAnchorEventWorkspace,
} from "@/domains/admin/queries/useAdminAnchorEvents";
import { useCreateAdminPRMessage } from "@/domains/admin/queries/useAdminPRManagement";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";

type Workspace = NonNullable<AdminAnchorEventWorkspaceResponse>;
type EventRecord = Workspace["events"][number];
type BatchRecord = EventRecord["timeWindows"][number];
type PRRecord = BatchRecord["prs"][number];

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminAnchorEventWorkspace(isAdmin);
const createMessageMutation = useCreateAdminPRMessage();

const selectedEventIdRaw = ref("");
const selectedBatchIdRaw = ref("");
const selectedPRIdRaw = ref("");
const draftBody = ref("");
const submitError = ref<string | null>(null);

const workspace = computed<Workspace | null>(() => workspaceQuery.data.value ?? null);
const events = computed<EventRecord[]>(() => workspace.value?.events ?? []);

const selectedEventId = computed<number | null>(() => {
  const parsed = Number(selectedEventIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedEvent = computed<EventRecord | null>(
  () => events.value.find((event) => event.id === selectedEventId.value) ?? null,
);

const selectedBatchId = computed<string | null>(() =>
  selectedBatchIdRaw.value.trim() || null,
);

const selectedBatch = computed<BatchRecord | null>(
  () =>
    selectedEvent.value?.timeWindows.find(
      (batch) => batch.key === selectedBatchId.value,
    ) ??
    null,
);

const selectedPRId = computed<number | null>(() => {
  const parsed = Number(selectedPRIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedPR = computed<PRRecord | null>(
  () => selectedBatch.value?.prs.find((pr) => pr.prId === selectedPRId.value) ?? null,
);

watch(draftBody, () => {
  submitError.value = null;
});

watch(
  events,
  (nextEvents) => {
    if (nextEvents.length === 0) {
      selectedEventIdRaw.value = "";
      return;
    }

    if (!nextEvents.some((event) => String(event.id) === selectedEventIdRaw.value)) {
      selectedEventIdRaw.value = String(nextEvents[0].id);
    }
  },
  { immediate: true },
);

watch(
  selectedEvent,
  (event) => {
    if (!event) {
      selectedBatchIdRaw.value = "";
      selectedPRIdRaw.value = "";
      return;
    }

    if (!event.timeWindows.some((batch) => batch.key === selectedBatchIdRaw.value)) {
      selectedBatchIdRaw.value = event.timeWindows[0]?.key ?? "";
    }
  },
  { immediate: true },
);

watch(
  selectedBatch,
  (batch) => {
    if (!batch) {
      selectedPRIdRaw.value = "";
      return;
    }

    if (!batch.prs.some((pr) => String(pr.prId) === selectedPRIdRaw.value)) {
      selectedPRIdRaw.value = batch.prs[0] ? String(batch.prs[0].prId) : "";
    }
  },
  { immediate: true },
);

watch(selectedPRId, () => {
  draftBody.value = "";
  submitError.value = null;
});

const selectEvent = (eventId: number) => {
  selectedEventIdRaw.value = String(eventId);
};

const selectBatch = (batchId: string) => {
  selectedBatchIdRaw.value = batchId;
};

const selectPR = (prId: number) => {
  selectedPRIdRaw.value = String(prId);
};

const formatWindow = (windowValue: [string | null, string | null]) =>
  formatLocalDateTimeWindowLabel(windowValue, {}, "?");

const handleSendSystemMessage = async () => {
  if (selectedPRId.value === null) return;

  const body = draftBody.value.trim();
  if (!body) return;

  submitError.value = null;
  try {
    await createMessageMutation.mutateAsync({
      prId: selectedPRId.value,
      input: { body },
    });
    draftBody.value = "";
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};
</script>

<style scoped lang="scss">
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
  gap: var(--sys-spacing-medium);
}

.stack--tight {
  gap: var(--sys-spacing-xsmall);
}

.stack--align-end {
  align-items: flex-end;
}

.header {
  gap: var(--sys-spacing-xsmall);
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
  padding: var(--sys-spacing-large);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}

.card-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.hint,
.empty-state {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.empty-state {
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.error-message {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-error);
}

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.selection-list--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-spacing-small);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field-label,
.meta-label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.field-textarea {
  min-height: 140px;
  resize: vertical;
}

.meta-grid {
  display: grid;
  gap: var(--sys-spacing-medium);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.actions {
  display: flex;
  justify-content: flex-end;
}

@media (min-width: 880px) {
  .meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
