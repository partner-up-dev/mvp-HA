<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">{{ t("adminPR.filtersTitle") }}</h2>
              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                @click="prepareNewPR"
              >
                {{ t("adminPR.newPRAction") }}
              </Button>
            </div>

            <label class="field">
              <span class="field-label">{{ t("adminPR.searchTypeLabel") }}</span>
              <input
                v-model="filters.type"
                class="field-input"
                list="admin-pr-type-options"
              />
            </label>

            <label class="field">
              <span class="field-label">{{
                t("adminPR.searchLocationLabel")
              }}</span>
              <input v-model="filters.location" class="field-input" />
            </label>

            <label class="field">
              <span class="field-label">{{ t("adminPR.searchStatusLabel") }}</span>
              <select v-model="filters.status" class="field-input">
                <option value="">{{ t("adminPR.searchStatusAll") }}</option>
                <option value="DRAFT">DRAFT</option>
                <option value="OPEN">OPEN</option>
                <option value="READY">READY</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="FULL">FULL</option>
                <option value="LOCKED_TO_START">LOCKED_TO_START</option>
                <option value="CLOSED">CLOSED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">{{ t("adminPR.searchStartLabel") }}</span>
              <input
                v-model="filters.startAt"
                class="field-input"
                type="datetime-local"
              />
            </label>

            <label class="field">
              <span class="field-label">{{ t("adminPR.searchEndLabel") }}</span>
              <input
                v-model="filters.endAt"
                class="field-input"
                type="datetime-local"
              />
            </label>
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
        <datalist id="admin-pr-type-options">
          <option
            v-for="typeOption in workspace?.typeOptions ?? []"
            :key="typeOption.type"
            :value="typeOption.type"
          >
            {{ typeOption.eventTitle }}
          </option>
        </datalist>

        <div class="grid-2">
          <section class="panel">
            <div class="stack">
              <div class="section-header">
                <h2 class="card-title">{{ t("adminPR.prsTitle") }}</h2>
                <p class="hint">
                  {{
                    t("adminPR.filteredCountLabel", {
                      count: filteredPRs.length,
                    })
                  }}
                </p>
              </div>

              <div v-if="filteredPRs.length === 0" class="hint">
                {{ t("adminPR.emptySearchResults") }}
              </div>

              <div v-else class="selection-list selection-list--grid">
                <ChoiceCard
                  v-for="pr in filteredPRs"
                  :key="pr.prId"
                  class="selection-btn"
                  :active="!isCreatingPR && selectedPRId === pr.prId"
                  @click="selectPR(pr.prId)"
                >
                  <span>{{ pr.title || pr.location || `#${pr.prId}` }}</span>
                  <small>#{{ pr.prId }} / {{ pr.status }}</small>
                  <small>{{ formatWindow(pr.time) }}</small>
                </ChoiceCard>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="stack">
              <h2 class="card-title">{{ t("adminPR.prFormTitle") }}</h2>

              <label class="field">
                <span class="field-label">{{ t("adminPR.prTitleLabel") }}</span>
                <input v-model="prForm.title" class="field-input" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPR.prTypeLabel") }}</span>
                <input
                  v-model="prForm.type"
                  class="field-input"
                  list="admin-pr-type-options"
                />
              </label>

              <div class="grid-2">
                <label class="field">
                  <span class="field-label">{{ t("adminPR.prTimeStartLabel") }}</span>
                  <input
                    v-model="prForm.startAt"
                    class="field-input"
                    type="datetime-local"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{ t("adminPR.prTimeEndLabel") }}</span>
                  <input
                    v-model="prForm.endAt"
                    class="field-input"
                    type="datetime-local"
                  />
                </label>
              </div>

              <label class="field">
                <span class="field-label">{{ t("adminPR.prLocationLabel") }}</span>
                <input v-model="prForm.location" class="field-input" />
              </label>

              <div class="grid-2">
                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.prMinPartnersLabel")
                  }}</span>
                  <input
                    v-model.number="prForm.minPartners"
                    class="field-input"
                    type="number"
                    min="2"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.prMaxPartnersLabel")
                  }}</span>
                  <input
                    v-model.number="prForm.maxPartners"
                    class="field-input"
                    type="number"
                    min="2"
                  />
                </label>
              </div>

              <p v-if="prBoundsValidationMessage" class="error-message">
                {{ prBoundsValidationMessage }}
              </p>
              <p v-if="timeValidationMessage" class="error-message">
                {{ timeValidationMessage }}
              </p>

              <TimelinePolicyPicker
                v-model="prPolicyValue"
                :title="t('adminPR.participationPolicyTitle')"
                :description="t('adminPR.participationPolicyDescription')"
                :event-start-at="resolvedTimeWindow[0]"
                :booking-deadline-at="selectedPR?.effectiveBookingDeadlineAt ?? null"
                :validation-message="policyValidationMessage"
              />

              <label class="field">
                <span class="field-label">{{
                  t("adminPR.prPreferencesLabel")
                }}</span>
                <input v-model="prForm.preferencesText" class="field-input" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPR.prNotesLabel") }}</span>
                <textarea
                  v-model="prForm.notes"
                  class="field-input field-textarea"
                ></textarea>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPR.prStatusLabel") }}</span>
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

              <p v-if="matchedTypeOption" class="hint">
                {{
                  t("adminPR.typeDefaultsHint", {
                    title: matchedTypeOption.eventTitle,
                  })
                }}
              </p>

              <Button
                appearance="pill"
                size="sm"
                type="button"
                :disabled="
                  isSavingPR ||
                  Boolean(prBoundsValidationMessage) ||
                  Boolean(timeValidationMessage) ||
                  Boolean(policyValidationMessage) ||
                  prForm.type.trim().length === 0 ||
                  prForm.location.trim().length === 0
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
          </section>
        </div>

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
  type AdminPRWorkspaceResponse,
  useAdminPRWorkspace,
  useCreateAdminPR,
  useUpdateAdminPRContent,
  useUpdateAdminPRStatus,
  useUpdateAdminPRVisibility,
} from "@/domains/admin/queries/useAdminPRManagement";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";
import { validateManualPartnerBounds } from "@/lib/validation";

type Workspace = NonNullable<AdminPRWorkspaceResponse>;
type PRRecord = Workspace["prs"][number];

type PRForm = {
  title: string;
  type: string;
  startAt: string;
  endAt: string;
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

const DEFAULT_CONFIRMATION_START_OFFSET_MINUTES = 120;
const DEFAULT_CONFIRMATION_END_OFFSET_MINUTES = 30;
const DEFAULT_JOIN_LOCK_OFFSET_MINUTES = 30;

const emptyPRForm = (): PRForm => ({
  title: "",
  type: "",
  startAt: "",
  endAt: "",
  location: "",
  minPartners: null,
  maxPartners: null,
  confirmationStartOffsetMinutes: DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  confirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  joinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  preferencesText: "",
  notes: "",
  status: "OPEN",
  visibilityStatus: "VISIBLE",
});

const toLocalDateTimeInput = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toIsoDateTime = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const toPRForm = (pr: PRRecord): PRForm => ({
  title: pr.title ?? "",
  type: pr.type,
  startAt: toLocalDateTimeInput(pr.time[0]),
  endAt: toLocalDateTimeInput(pr.time[1]),
  location: pr.location ?? "",
  minPartners: pr.minPartners,
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
const createPRMutation = useCreateAdminPR();
const updatePRContentMutation = useUpdateAdminPRContent();
const updatePRStatusMutation = useUpdateAdminPRStatus();
const updatePRVisibilityMutation = useUpdateAdminPRVisibility();

const filters = ref({
  type: "",
  location: "",
  status: "",
  startAt: "",
  endAt: "",
});

const selectedPRIdRaw = ref("");
const isCreatingPR = ref(false);
const prForm = ref<PRForm>(emptyPRForm());
const lastAppliedType = ref<string | null>(null);

const workspace = computed<Workspace | null>(() => workspaceQuery.data.value ?? null);
const prs = computed<PRRecord[]>(() => workspace.value?.prs ?? []);
const typeOptions = computed(() => workspace.value?.typeOptions ?? []);

const selectedPRId = computed<number | null>(() => {
  const parsed = Number(selectedPRIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedPR = computed<PRRecord | null>(
  () => prs.value.find((pr) => pr.prId === selectedPRId.value) ?? null,
);

const matchedTypeOption = computed(
  () =>
    typeOptions.value.find(
      (option) => option.type.trim() === prForm.value.type.trim(),
    ) ?? null,
);

const filteredPRs = computed(() => {
  const normalizedType = filters.value.type.trim().toLowerCase();
  const normalizedLocation = filters.value.location.trim().toLowerCase();
  const filterStartAt = toIsoDateTime(filters.value.startAt);
  const filterEndAt = toIsoDateTime(filters.value.endAt);

  return prs.value.filter((pr) => {
    if (
      normalizedType &&
      !pr.type.toLowerCase().includes(normalizedType)
    ) {
      return false;
    }
    if (
      normalizedLocation &&
      !(pr.location ?? "").toLowerCase().includes(normalizedLocation)
    ) {
      return false;
    }
    if (filters.value.status && pr.status !== filters.value.status) {
      return false;
    }

    const prStartAt = pr.time[0] ? new Date(pr.time[0]).getTime() : null;
    const prEndAt = pr.time[1] ? new Date(pr.time[1]).getTime() : null;
    if (filterStartAt) {
      const filterStartTime = new Date(filterStartAt).getTime();
      if (prEndAt !== null && prEndAt < filterStartTime) {
        return false;
      }
    }
    if (filterEndAt) {
      const filterEndTime = new Date(filterEndAt).getTime();
      if (prStartAt !== null && prStartAt > filterEndTime) {
        return false;
      }
    }

    return true;
  });
});

const resolvedTimeWindow = computed<[string | null, string | null]>(() => [
  toIsoDateTime(prForm.value.startAt),
  toIsoDateTime(prForm.value.endAt),
]);

const prBoundsValidationMessage = computed(() =>
  validateManualPartnerBounds(prForm.value.minPartners, prForm.value.maxPartners),
);

const timeValidationMessage = computed(() => {
  const [startAt, endAt] = resolvedTimeWindow.value;
  if (!startAt || !endAt) {
    return t("adminPR.timeWindowRequired");
  }
  if (new Date(startAt).getTime() > new Date(endAt).getTime()) {
    return t("adminPR.timeWindowValidationStartBeforeEnd");
  }
  return null;
});

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

const isSavingPR = computed(
  () =>
    createPRMutation.isPending.value ||
    updatePRContentMutation.isPending.value ||
    updatePRStatusMutation.isPending.value ||
    updatePRVisibilityMutation.isPending.value,
);

const mutationErrorMessage = computed(
  () =>
    createPRMutation.error.value?.message ||
    updatePRContentMutation.error.value?.message ||
    updatePRStatusMutation.error.value?.message ||
    updatePRVisibilityMutation.error.value?.message ||
    null,
);

watch(
  prs,
  (nextPRs) => {
    if (isCreatingPR.value || nextPRs.length === 0) {
      if (nextPRs.length === 0) {
        selectedPRIdRaw.value = "";
      }
      return;
    }
    if (!nextPRs.some((pr) => String(pr.prId) === selectedPRIdRaw.value)) {
      selectedPRIdRaw.value = String(nextPRs[0].prId);
    }
  },
  { immediate: true },
);

watch(
  [selectedPR, isCreatingPR],
  ([pr, creating]) => {
    if (creating || !pr) {
      prForm.value = emptyPRForm();
      lastAppliedType.value = null;
      return;
    }
    prForm.value = toPRForm(pr);
    lastAppliedType.value = null;
  },
  { immediate: true },
);

watch(
  [() => prForm.value.type, isCreatingPR],
  ([type, creating]) => {
    if (!creating) return;
    const matched = typeOptions.value.find((option) => option.type === type.trim());
    if (!matched || lastAppliedType.value === matched.type) {
      return;
    }
    prForm.value = {
      ...prForm.value,
      minPartners: matched.defaultMinPartners,
      maxPartners: matched.defaultMaxPartners,
      confirmationStartOffsetMinutes:
        matched.defaultConfirmationStartOffsetMinutes,
      confirmationEndOffsetMinutes: matched.defaultConfirmationEndOffsetMinutes,
      joinLockOffsetMinutes: matched.defaultJoinLockOffsetMinutes,
    };
    lastAppliedType.value = matched.type;
  },
);

const formatWindow = (windowValue: [string | null, string | null]) =>
  formatLocalDateTimeWindowLabel(windowValue, {}, "?");

const normalizeComma = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const prepareNewPR = () => {
  isCreatingPR.value = true;
  selectedPRIdRaw.value = "";
  prForm.value = emptyPRForm();
  lastAppliedType.value = null;
};

const selectPR = (prId: number) => {
  isCreatingPR.value = false;
  selectedPRIdRaw.value = String(prId);
};

const resetMutationErrors = () => {
  createPRMutation.reset();
  updatePRContentMutation.reset();
  updatePRStatusMutation.reset();
  updatePRVisibilityMutation.reset();
};

const handleSavePR = async () => {
  if (
    prBoundsValidationMessage.value ||
    timeValidationMessage.value ||
    policyValidationMessage.value
  ) {
    return;
  }

  const [startAt, endAt] = resolvedTimeWindow.value;
  if (!startAt || !endAt) {
    return;
  }

  const contentInput = {
    timeWindow: [startAt, endAt] as [string, string],
    title: prForm.value.title.trim() || null,
    type: prForm.value.type.trim(),
    location: prForm.value.location.trim(),
    minPartners: prForm.value.minPartners,
    maxPartners: prForm.value.maxPartners,
    preferences: normalizeComma(prForm.value.preferencesText),
    notes: prForm.value.notes.trim() || null,
    confirmationStartOffsetMinutes: prForm.value.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: prForm.value.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: prForm.value.joinLockOffsetMinutes,
  };

  try {
    if (isCreatingPR.value || selectedPRId.value === null) {
      const result = await createPRMutation.mutateAsync(contentInput);
      isCreatingPR.value = false;
      selectedPRIdRaw.value = String(result.root.id);
      return;
    }

    await updatePRContentMutation.mutateAsync({
      prId: selectedPRId.value,
      input: contentInput,
    });

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

@media (min-width: 880px) {
  .grid-2 {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  }
}
</style>
