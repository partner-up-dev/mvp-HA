<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <h2 class="card-title">{{ t("adminBookingExecution.searchTitle") }}</h2>
            <label class="field">
              <span class="field-label">{{
                t("adminBookingExecution.searchLabel")
              }}</span>
              <input
                v-model="searchText"
                class="field-input"
                :placeholder="t('adminBookingExecution.searchPlaceholder')"
              />
            </label>
            <div class="stats-list">
              <p class="stat-line">
                <span>{{ t("adminBookingExecution.statsPending") }}</span>
                <strong>{{ pendingItems.length }}</strong>
              </p>
              <p class="stat-line">
                <span>{{ t("adminBookingExecution.statsAudit") }}</span>
                <strong>{{ auditItems.length }}</strong>
              </p>
              <p class="stat-line">
                <span>{{ t("adminBookingExecution.statsFilteredPending") }}</span>
                <strong>{{ filteredPendingItems.length }}</strong>
              </p>
              <p class="stat-line">
                <span>{{ t("adminBookingExecution.statsFilteredAudit") }}</span>
                <strong>{{ filteredAuditItems.length }}</strong>
              </p>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #header>
      <header class="header">
        <h1 class="title">{{ t("adminBookingExecution.title") }}</h1>
        <p class="subtitle">{{ t("adminBookingExecution.subtitle") }}</p>
      </header>
    </template>

    <div class="stack">
      <LoadingIndicator
        v-if="workspaceQuery.isLoading.value"
        :message="t('common.loading')"
      />
      <ErrorToast
        v-else-if="pageError"
        :message="pageError.message"
        persistent
      />

      <template v-else>
        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">
                {{ t("adminBookingExecution.pendingTitle") }}
              </h2>
              <p class="hint">
                {{
                  t("adminBookingExecution.searchHintWithCount", {
                    count: filteredPendingItems.length,
                  })
                }}
              </p>
            </div>

            <div
              v-if="filteredPendingItems.length === 0"
              class="empty-state"
            >
              {{ t("adminBookingExecution.pendingEmpty") }}
            </div>

            <div v-else class="card-list">
              <article
                v-for="item in filteredPendingItems"
                :key="item.prId"
                class="card"
              >
                <div class="section-header">
                  <div class="stack stack--tight">
                    <h3 class="card-title">
                      {{ formatPrTitle(item.prId, item.prTitle) }}
                    </h3>
                    <p class="hint">
                      #{{ item.prId }} / {{ item.prType }} / {{ item.status }}
                    </p>
                  </div>
                  <div class="resource-chip-list">
                    <span
                      v-for="resource in item.eligibleResources"
                      :key="resource.id"
                      class="resource-chip"
                    >
                      {{ resource.title }}
                    </span>
                  </div>
                </div>

                <div class="meta-grid">
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.eventLabel")
                    }}</span>
                    <strong>{{ item.eventTitle ?? t("adminBookingExecution.noneText") }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.batchLabel")
                    }}</span>
                    <strong>{{
                      item.batchTimeWindow
                        ? formatWindow(item.batchTimeWindow)
                        : t("adminBookingExecution.noneText")
                    }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.timeLabel")
                    }}</span>
                    <strong>{{ formatWindow(item.timeWindow) }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.locationLabel")
                    }}</span>
                    <strong>{{
                      item.location ?? t("adminBookingExecution.noneText")
                    }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.bookingTriggeredLabel")
                    }}</span>
                    <strong>{{ formatDateTime(item.bookingTriggeredAt) }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.bookingDeadlineLabel")
                    }}</span>
                    <strong>{{
                      formatDateTime(item.effectiveBookingDeadlineAt)
                    }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.partnerCountLabel")
                    }}</span>
                    <strong>{{ item.partnerCount }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.contactStateLabel")
                    }}</span>
                    <strong>{{
                      formatContactState(item.bookingContact.state)
                    }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.contactOwnerLabel")
                    }}</span>
                    <strong>{{
                      formatContactOwner(
                        item.bookingContact.ownerNickname,
                        item.bookingContact.ownerPartnerId,
                      )
                    }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.phoneLabel")
                    }}</span>
                    <strong>{{
                      item.bookingContact.fullPhone ??
                      t("adminBookingExecution.noPhone")
                    }}</strong>
                  </div>
                </div>

                <div
                  v-if="drafts[item.prId]"
                  class="field-grid"
                >
                  <label class="field">
                    <span class="field-label">{{
                      t("adminBookingExecution.targetResourceLabel")
                    }}</span>
                    <select
                      v-model.number="drafts[item.prId].targetResourceId"
                      class="field-input"
                      @change="clearDraftMessage(item.prId)"
                    >
                      <option
                        v-for="resource in item.eligibleResources"
                        :key="resource.id"
                        :value="resource.id"
                      >
                        {{ resource.title }}
                      </option>
                    </select>
                  </label>

                  <label class="field">
                    <span class="field-label">{{
                      t("adminBookingExecution.executionResultLabel")
                    }}</span>
                    <select
                      v-model="drafts[item.prId].result"
                      class="field-input"
                      @change="clearDraftMessage(item.prId)"
                    >
                      <option value="SUCCESS">
                        {{ t("adminBookingExecution.resultSuccess") }}
                      </option>
                      <option value="FAILED">
                        {{ t("adminBookingExecution.resultFailed") }}
                      </option>
                    </select>
                  </label>

                  <label class="field field--full">
                    <span class="field-label">{{
                      t("adminBookingExecution.failureReasonLabel")
                    }}</span>
                    <textarea
                      v-model="drafts[item.prId].reason"
                      class="field-input field-textarea"
                      :placeholder="t('adminBookingExecution.failureReasonHint')"
                      @input="clearDraftMessage(item.prId)"
                    />
                  </label>

                  <label class="field field--full">
                    <span class="field-label">{{
                      t("adminBookingExecution.releaseReasonLabel")
                    }}</span>
                    <input
                      v-model="drafts[item.prId].releaseReason"
                      class="field-input"
                      @input="clearDraftMessage(item.prId)"
                    />
                  </label>
                </div>

                <div class="stack stack--tight">
                  <p v-if="selectedResourceSummary(item)" class="hint">
                    {{ selectedResourceSummary(item) }}
                  </p>
                  <p
                    v-if="drafts[item.prId]?.errorMessage"
                    class="field-error"
                  >
                    {{ drafts[item.prId].errorMessage }}
                  </p>
                  <div class="action-row">
                    <Button
                      appearance="pill"
                      size="sm"
                      type="button"
                      :disabled="isSubmitDisabled(item)"
                      @click="handleSubmit(item)"
                    >
                      {{
                        submittingPrId === item.prId
                          ? t("adminBookingExecution.submittingAction")
                          : t("adminBookingExecution.submitAction")
                      }}
                    </Button>
                    <Button
                      appearance="pill"
                      tone="outline"
                      size="sm"
                      type="button"
                      :disabled="isReleaseDisabled(item)"
                      @click="handleRelease(item)"
                    >
                      {{
                        releasingPrId === item.prId
                          ? t("adminBookingExecution.releasingAction")
                          : t("adminBookingExecution.releaseAction")
                      }}
                    </Button>
                  </div>
                  <p
                    v-if="item.bookingContact.ownerPartnerId === null"
                    class="hint"
                  >
                    {{ t("adminBookingExecution.releaseUnavailableHint") }}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">
                {{ t("adminBookingExecution.auditTitle") }}
              </h2>
              <p class="hint">
                {{
                  t("adminBookingExecution.searchHintWithCount", {
                    count: filteredAuditItems.length,
                  })
                }}
              </p>
            </div>

            <div
              v-if="filteredAuditItems.length === 0"
              class="empty-state"
            >
              {{ t("adminBookingExecution.auditEmpty") }}
            </div>

            <div v-else class="card-list">
              <article
                v-for="audit in filteredAuditItems"
                :key="`${audit.kind}-${audit.prId}-${audit.createdAt}`"
                class="card"
              >
                <div class="section-header">
                  <div class="stack stack--tight">
                    <h3 class="card-title">
                      {{ formatPrTitle(audit.prId, audit.prTitle) }}
                    </h3>
                    <p class="hint">
                      {{
                        audit.kind === "BOOKING_EXECUTION"
                          ? t("adminBookingExecution.auditBookingExecutionLabel")
                          : t("adminBookingExecution.auditManualReleaseLabel")
                      }}
                    </p>
                  </div>
                  <strong>{{ formatDateTime(audit.createdAt) }}</strong>
                </div>

                <div class="meta-grid">
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.auditOperatorLabel")
                    }}</span>
                    <strong>{{
                      audit.actorLabel ?? t("adminBookingExecution.noActor")
                    }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.auditPhoneLabel")
                    }}</span>
                    <strong>{{
                      audit.bookingContactPhone ??
                      t("adminBookingExecution.noPhone")
                    }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.locationLabel")
                    }}</span>
                    <strong>{{
                      audit.location ?? t("adminBookingExecution.noneText")
                    }}</strong>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">{{
                      t("adminBookingExecution.timeLabel")
                    }}</span>
                    <strong>{{
                      audit.timeWindow
                        ? formatWindow(audit.timeWindow)
                        : t("adminBookingExecution.noneText")
                    }}</strong>
                  </div>

                  <template v-if="audit.kind === 'BOOKING_EXECUTION'">
                    <div class="meta-item">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditResultLabel")
                      }}</span>
                      <strong>{{
                        audit.result === "SUCCESS"
                          ? t("adminBookingExecution.resultSuccess")
                          : t("adminBookingExecution.resultFailed")
                      }}</strong>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditResourceLabel")
                      }}</span>
                      <strong>{{ audit.targetResourceTitle }}</strong>
                    </div>
                    <div class="meta-item field--full">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditReasonLabel")
                      }}</span>
                      <strong>{{
                        audit.reason ?? t("adminBookingExecution.noReason")
                      }}</strong>
                    </div>
                    <div class="meta-item field--full">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditNotificationSummaryLabel")
                      }}</span>
                      <strong>
                        {{
                          formatNotificationSummary(audit.notificationSummary)
                        }}
                      </strong>
                    </div>
                  </template>

                  <template v-else>
                    <div class="meta-item">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditPartnerLabel")
                      }}</span>
                      <strong>{{
                        audit.partnerId ?? t("adminBookingExecution.noneText")
                      }}</strong>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditReleasedUserLabel")
                      }}</span>
                      <strong>{{
                        audit.releasedUserId ??
                        t("adminBookingExecution.noneText")
                      }}</strong>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditBookingContactCleared")
                      }}</span>
                      <strong>{{
                        audit.bookingContactCleared
                          ? t("adminBookingExecution.booleanYes")
                          : t("adminBookingExecution.booleanNo")
                      }}</strong>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditCreatorTransferredLabel")
                      }}</span>
                      <strong>{{
                        audit.creatorTransferredToUserId ??
                        t("adminBookingExecution.noneText")
                      }}</strong>
                    </div>
                    <div class="meta-item field--full">
                      <span class="meta-label">{{
                        t("adminBookingExecution.auditReasonLabel")
                      }}</span>
                      <strong>{{
                        audit.reason ?? t("adminBookingExecution.noReason")
                      }}</strong>
                    </div>
                  </template>
                </div>
              </article>
            </div>
          </div>
        </section>
      </template>
    </div>
  </DesktopPageScaffold>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminNavigationCard from "@/domains/admin/ui/composites/AdminNavigationCard.vue";
import {
  type AdminBookingExecutionWorkspaceResponse,
  useAdminBookingExecutionWorkspace,
  useReleaseAdminAnchorPRPartnerForExecution,
  useSubmitAdminAnchorPRBookingExecution,
} from "@/domains/admin/queries/useAdminBookingExecution";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import { formatLocalDateTimeValue, formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";
import Button from "@/shared/ui/actions/Button.vue";

type Workspace = NonNullable<AdminBookingExecutionWorkspaceResponse>;
type PendingItem = Workspace["pendingItems"][number];
type AuditItem = Workspace["auditItems"][number];
type EligibleResource = PendingItem["eligibleResources"][number];

type PendingDraft = {
  targetResourceId: number;
  result: "SUCCESS" | "FAILED";
  reason: string;
  releaseReason: string;
  errorMessage: string | null;
};

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminBookingExecutionWorkspace(isAdmin);
const submitMutation = useSubmitAdminAnchorPRBookingExecution();
const releaseMutation = useReleaseAdminAnchorPRPartnerForExecution();

const searchText = ref("");
const drafts = reactive<Record<number, PendingDraft>>({});
const submittingPrId = ref<number | null>(null);
const releasingPrId = ref<number | null>(null);

const workspace = computed<Workspace | null>(() => workspaceQuery.data.value ?? null);
const pendingItems = computed<PendingItem[]>(() => workspace.value?.pendingItems ?? []);
const auditItems = computed<AuditItem[]>(() => workspace.value?.auditItems ?? []);
const pageError = computed(() => workspaceQuery.error.value ?? null);
const normalizedSearch = computed(() => searchText.value.trim().toLowerCase());

const createDraft = (item: PendingItem): PendingDraft => ({
  targetResourceId: item.eligibleResources[0]?.id ?? 0,
  result: "SUCCESS",
  reason: "",
  releaseReason: t("adminBookingExecution.defaultReleaseReason"),
  errorMessage: null,
});

watch(
  pendingItems,
  (nextItems) => {
    const activeIds = new Set(nextItems.map((item) => item.prId));

    for (const item of nextItems) {
      const existing = drafts[item.prId];
      if (!existing) {
        drafts[item.prId] = createDraft(item);
        continue;
      }

      if (
        !item.eligibleResources.some(
          (resource: EligibleResource) =>
            resource.id === existing.targetResourceId,
        )
      ) {
        existing.targetResourceId = item.eligibleResources[0]?.id ?? 0;
      }
    }

    for (const key of Object.keys(drafts)) {
      const prId = Number(key);
      if (!activeIds.has(prId)) {
        delete drafts[prId];
      }
    }
  },
  { immediate: true },
);

const formatDateTime = (value: string | null) =>
  formatLocalDateTimeValue(value) ?? t("adminBookingExecution.noneText");

const formatWindow = (timeWindow: [string | null, string | null]) =>
  formatLocalDateTimeWindowLabel(
    timeWindow,
    {},
    t("adminBookingExecution.noneText"),
  );

const formatPrTitle = (prId: number, title: string | null) =>
  title?.trim() ||
  t("adminBookingExecution.prFallbackTitle", {
    id: prId,
  });

const formatContactState = (
  state: PendingItem["bookingContact"]["state"],
): string => {
  if (state === "VERIFIED") {
    return t("adminBookingExecution.contactStateVerified");
  }
  if (state === "MISSING") {
    return t("adminBookingExecution.contactStateMissing");
  }
  return t("adminBookingExecution.contactStateNotRequired");
};

const formatContactOwner = (
  nickname: string | null,
  partnerId: number | null,
): string => {
  if (partnerId === null) {
    return t("adminBookingExecution.ownerFallback");
  }
  return nickname?.trim()
    ? `${nickname.trim()} (#${partnerId})`
    : `#${partnerId}`;
};

const buildPendingSearchText = (item: PendingItem): string =>
  [
    item.prId,
    item.prTitle,
    item.prType,
    item.location,
    item.status,
    item.eventTitle,
    item.bookingContact.fullPhone,
    item.bookingContact.maskedPhone,
    item.bookingContact.ownerNickname,
    item.bookingContact.ownerPartnerId,
    ...item.eligibleResources.flatMap((resource: EligibleResource) => [
      resource.title,
      resource.summaryText,
    ]),
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();

const buildAuditSearchText = (item: AuditItem): string => {
  if (item.kind === "BOOKING_EXECUTION") {
    return [
      item.prId,
      item.prTitle,
      item.prType,
      item.location,
      item.actorLabel,
      item.actorUserId,
      item.bookingContactPhone,
      item.result,
      item.reason,
      item.targetResourceTitle,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();
  }

  return [
    item.prId,
    item.prTitle,
    item.prType,
    item.location,
    item.actorLabel,
    item.actorUserId,
    item.bookingContactPhone,
    item.reason,
    item.partnerId,
    item.releasedUserId,
    item.creatorTransferredToUserId,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
};

const filteredPendingItems = computed(() => {
  const query = normalizedSearch.value;
  if (!query) return pendingItems.value;
  return pendingItems.value.filter((item) =>
    buildPendingSearchText(item).includes(query),
  );
});

const filteredAuditItems = computed(() => {
  const query = normalizedSearch.value;
  if (!query) return auditItems.value;
  return auditItems.value.filter((item) =>
    buildAuditSearchText(item).includes(query),
  );
});

const clearDraftMessage = (prId: number) => {
  const draft = drafts[prId];
  if (draft) {
    draft.errorMessage = null;
  }
};

const selectedResourceSummary = (item: PendingItem): string | null => {
  const draft = drafts[item.prId];
  if (!draft) return null;

  const resource =
    item.eligibleResources.find(
      (candidate: EligibleResource) => candidate.id === draft.targetResourceId,
    ) ?? null;

  return resource?.summaryText?.trim() || null;
};

const isSubmitDisabled = (item: PendingItem): boolean => {
  const draft = drafts[item.prId];
  if (!draft) return true;

  return (
    submittingPrId.value === item.prId ||
    !item.eligibleResources.some(
      (resource: EligibleResource) => resource.id === draft.targetResourceId,
    )
  );
};

const isReleaseDisabled = (item: PendingItem): boolean =>
  releasingPrId.value === item.prId ||
  item.bookingContact.ownerPartnerId === null;

const formatNotificationSummary = (summary: {
  targetCount: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
}): string =>
  [
    t("adminBookingExecution.notificationTargetCount", {
      count: summary.targetCount,
    }),
    t("adminBookingExecution.notificationSuccessCount", {
      count: summary.successCount,
    }),
    t("adminBookingExecution.notificationFailureCount", {
      count: summary.failureCount,
    }),
    t("adminBookingExecution.notificationSkippedCount", {
      count: summary.skippedCount,
    }),
  ].join(" / ");

const handleSubmit = async (item: PendingItem) => {
  const draft = drafts[item.prId];
  if (!draft) return;

  clearDraftMessage(item.prId);

  if (draft.result === "FAILED" && !draft.reason.trim()) {
    draft.errorMessage = t("adminBookingExecution.reasonRequiredValidation");
    return;
  }

  submittingPrId.value = item.prId;

  try {
    await submitMutation.mutateAsync({
      prId: item.prId,
      input: {
        targetResourceId: draft.targetResourceId,
        result: draft.result,
        reason: draft.reason.trim() || null,
      },
    });
  } catch (error) {
    draft.errorMessage =
      error instanceof Error ? error.message : t("common.operationFailed");
  } finally {
    submittingPrId.value = null;
  }
};

const handleRelease = async (item: PendingItem) => {
  const draft = drafts[item.prId];
  if (!draft || item.bookingContact.ownerPartnerId === null) return;

  clearDraftMessage(item.prId);

  const releaseReason = draft.releaseReason.trim();
  if (!releaseReason) {
    draft.errorMessage = t("adminBookingExecution.releaseReasonRequired");
    return;
  }

  releasingPrId.value = item.prId;

  try {
    await releaseMutation.mutateAsync({
      prId: item.prId,
      partnerId: item.bookingContact.ownerPartnerId,
      input: {
        reason: releaseReason,
      },
    });
  } catch (error) {
    draft.errorMessage =
      error instanceof Error ? error.message : t("common.operationFailed");
  } finally {
    releasingPrId.value = null;
  }
};
</script>

<style lang="scss" scoped>
.sidebar,
.stack,
.header,
.stats-list,
.card-list,
.card,
.field {
  display: flex;
  flex-direction: column;
}

.sidebar,
.stack,
.header,
.card-list {
  gap: var(--sys-spacing-med);
}

.stack--tight {
  gap: var(--sys-spacing-xs);
}

.header {
  gap: var(--sys-spacing-xs);
}

.title,
.subtitle,
.card-title,
.hint,
.stat-line,
.empty-state,
.field-error {
  margin: 0;
}

.title {
  @include mx.pu-font(headline-small);
}

.subtitle,
.hint,
.empty-state {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.card-title {
  @include mx.pu-font(title-medium);
}

.panel,
.card {
  padding: var(--sys-spacing-lg);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface-container);
}

.card {
  gap: var(--sys-spacing-med);
}

.section-header,
.action-row,
.stat-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.stats-list {
  gap: var(--sys-spacing-sm);
}

.stat-line {
  @include mx.pu-font(body-medium);
}

.resource-chip-list {
  display: flex;
  gap: var(--sys-spacing-xs);
  flex-wrap: wrap;
}

.resource-chip {
  @include mx.pu-font(label-small);
  padding: var(--sys-spacing-2xs) var(--sys-spacing-sm);
  border-radius: var(--sys-radius-pill);
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-primary);
}

.meta-grid,
.field-grid {
  display: grid;
  gap: var(--sys-spacing-sm);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-2xs);
}

.meta-label,
.field-label {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.field {
  gap: var(--sys-spacing-xs);
}

.field--full {
  grid-column: 1 / -1;
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

.field-error {
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

@media (min-width: 900px) {
  .meta-grid,
  .field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
