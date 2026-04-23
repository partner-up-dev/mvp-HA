<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <h2 class="card-title">{{ t("adminAnchorPRMessages.eventsTitle") }}</h2>
            <div v-if="events.length === 0" class="hint">
              {{ t("adminAnchorPRMessages.emptyEvents") }}
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
            <h2 class="card-title">{{ t("adminAnchorPRMessages.timeWindowsTitle") }}</h2>
            <div v-if="selectedEvent === null" class="hint">
              {{ t("adminAnchorPRMessages.selectEventHint") }}
            </div>
            <div v-else-if="selectedEvent.timeWindows.length === 0" class="hint">
              {{ t("adminAnchorPRMessages.emptyTimeWindows") }}
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
                  t("adminAnchorPRMessages.generatedPRCount", {
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
        <h1 class="title">{{ t("adminAnchorPRMessages.title") }}</h1>
        <p class="subtitle">{{ t("adminAnchorPRMessages.subtitle") }}</p>
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
                {{ t("adminAnchorPRMessages.anchorPRsTitle") }}
              </h2>
              <p class="hint">
                {{
                  t("adminAnchorPRMessages.selectedCount", {
                    count: selectedBatch?.prs.length ?? 0,
                  })
                }}
              </p>
            </div>

            <div v-if="selectedBatch === null" class="hint">
              {{ t("adminAnchorPRMessages.selectBatchHint") }}
            </div>
            <div v-else-if="selectedBatch.prs.length === 0" class="hint">
              {{ t("adminAnchorPRMessages.emptyAnchorPRs") }}
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
                  t("adminAnchorPRMessages.partnerCountWithValue", {
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
                  {{ t("adminAnchorPRMessages.composerTitle") }}
                </h2>
                <p class="hint">
                  {{ t("adminAnchorPRMessages.composerHint") }}
                </p>
              </div>
              <div v-if="selectedPR" class="stack stack--tight stack--align-end">
                <strong>{{ selectedPR.title || selectedPR.location || `#${selectedPR.prId}` }}</strong>
                <span class="hint">#{{ selectedPR.prId }}</span>
              </div>
            </div>

            <div v-if="selectedPR === null" class="empty-state">
              {{ t("adminAnchorPRMessages.selectPRHint") }}
            </div>

            <template v-else>
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">{{ t("adminAnchorPRMessages.eventLabel") }}</span>
                  <strong>{{ selectedEvent?.title ?? "-" }}</strong>
                </div>
                <div class="meta-item">
                  <span class="meta-label">{{ t("adminAnchorPRMessages.batchLabel") }}</span>
                  <strong>{{ selectedBatch ? formatWindow(selectedBatch.timeWindow) : "-" }}</strong>
                </div>
                <div class="meta-item">
                  <span class="meta-label">{{ t("adminAnchorPRMessages.locationLabel") }}</span>
                  <strong>{{ selectedPR.location ?? "-" }}</strong>
                </div>
                <div class="meta-item">
                  <span class="meta-label">{{ t("adminAnchorPRMessages.statusLabel") }}</span>
                  <strong>{{ selectedPR.status }} / {{ selectedPR.visibilityStatus }}</strong>
                </div>
              </div>

              <label class="field">
                <span class="field-label">{{
                  t("adminAnchorPRMessages.messageLabel")
                }}</span>
                <textarea
                  v-model="draftBody"
                  class="field-input field-textarea"
                  :placeholder="t('adminAnchorPRMessages.messagePlaceholder')"
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
                      ? t("adminAnchorPRMessages.messageSending")
                      : t("adminAnchorPRMessages.messageAction")
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
  type AdminAnchorWorkspaceResponse,
  useAdminAnchorWorkspace,
  useCreateAdminAnchorPRMessage,
} from "@/domains/admin/queries/useAdminAnchorManagement";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";

type Workspace = NonNullable<AdminAnchorWorkspaceResponse>;
type EventRecord = Workspace["events"][number];
type BatchRecord = EventRecord["timeWindows"][number];
type PRRecord = BatchRecord["prs"][number];

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminAnchorWorkspace(isAdmin);
const createMessageMutation = useCreateAdminAnchorPRMessage();

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
  gap: var(--sys-spacing-med);
}

.stack--tight {
  gap: var(--sys-spacing-xs);
}

.stack--align-end {
  align-items: flex-end;
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

.hint,
.empty-state {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.empty-state {
  padding: var(--sys-spacing-med);
  border-radius: var(--sys-radius-sm);
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

.field-label,
.meta-label {
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
  min-height: 140px;
  resize: vertical;
}

.meta-grid {
  display: grid;
  gap: var(--sys-spacing-med);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-2xs);
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
