<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />
        <section class="panel">
          <div class="stack">
            <label class="field">
              <span class="field-label">{{ t("adminBookingSupport.eventLabel") }}</span>
              <select v-model="selectedEventIdRaw" class="field-input">
                <option value="">{{ t("adminBookingSupport.eventPlaceholder") }}</option>
                <option v-for="event in anchorEvents" :key="event.id" :value="String(event.id)">
                  {{ event.title }}
                </option>
              </select>
            </label>
          </div>
        </section>
      </div>
    </template>

    <template #header>
      <header class="header">
        <h1 class="title">{{ t("adminBookingSupport.title") }}</h1>
        <p class="subtitle">{{ t("adminBookingSupport.subtitle") }}</p>
      </header>
    </template>

    <div class="stack">
      <LoadingIndicator v-if="workspaceQuery.isLoading.value || configQuery.isLoading.value" :message="t('common.loading')" />
      <ErrorToast v-else-if="pageError" :message="pageError.message" persistent />

      <template v-else-if="config">
        <section class="panel">
          <div class="stack">
            <div class="section-header">
              <h2 class="card-title">{{ t("adminBookingSupport.eventResourcesTitle") }}</h2>
              <Button appearance="pill" tone="outline" size="sm" type="button" @click="addEventResource">{{ t("adminBookingSupport.addResourceAction") }}</Button>
            </div>

            <div class="editor-list">
              <article v-for="(resource, index) in editableResources" :key="`resource-${index}`" class="editor-block">
                <div class="action-row">
                  <strong>{{ resource.title || `${t("adminBookingSupport.resourceFallback")} ${index + 1}` }}</strong>
                  <Button tone="danger" size="sm" type="button" @click="removeEventResource(index)">{{ t("adminBookingSupport.removeAction") }}</Button>
                </div>
                <div class="grid">
                  <label class="field"><span class="field-label">code</span><input v-model="resource.code" class="field-input" /></label>
                  <label class="field"><span class="field-label">{{ t("adminBookingSupport.resourceTitle") }}</span><input v-model="resource.title" class="field-input" /></label>
                  <label class="field">
                    <span class="field-label">{{ t("adminBookingSupport.resourceKind") }}</span>
                    <select v-model="resource.resourceKind" class="field-input"><option value="VENUE">VENUE</option><option value="ITEM">ITEM</option><option value="SERVICE">SERVICE</option><option value="OTHER">OTHER</option></select>
                  </label>
                  <label class="field"><span class="field-label">{{ t("adminBookingSupport.displayOrder") }}</span><input v-model.number="resource.displayOrder" class="field-input" type="number" /></label>
                  <label class="checkbox-field"><input v-model="resource.appliesToAllLocations" type="checkbox" /><span>{{ t("adminBookingSupport.appliesToAllLocations") }}</span></label>
                  <label class="checkbox-field"><input v-model="resource.bookingRequired" type="checkbox" /><span>{{ t("adminBookingSupport.bookingRequired") }}</span></label>
                  <label class="checkbox-field"><input v-model="resource.bookingLocksParticipant" type="checkbox" /><span>{{ t("adminBookingSupport.bookingLocksParticipant") }}</span></label>
                  <label class="checkbox-field"><input v-model="resource.requiresUserTransferToPlatform" type="checkbox" /><span>{{ t("adminBookingSupport.requiresTransfer") }}</span></label>
                  <label class="field field--full">
                    <span class="field-label">{{ t("adminBookingSupport.locationIds") }}</span>
                    <select
                      v-model="resource.locationIds"
                      class="field-input field-input--multiselect"
                      :disabled="resource.appliesToAllLocations"
                      multiple
                    >
                      <option
                        v-for="location in availableLocationOptions"
                        :key="location"
                        :value="location"
                      >
                        {{ location }}
                      </option>
                    </select>
                    <span v-if="!resource.appliesToAllLocations" class="hint">
                      {{ t("adminBookingSupport.locationSelectorHint") }}
                    </span>
                    <span
                      v-if="hasResourceLocationValidationError(index)"
                      class="field-error"
                    >
                      {{ t("adminBookingSupport.locationRequiredValidation") }}
                    </span>
                  </label>
                  <label class="field">
                    <span class="field-label">{{ t("adminBookingSupport.bookingHandledBy") }}</span>
                    <select v-model="resource.bookingHandledBy" class="field-input"><option :value="null">{{ t("adminBookingSupport.noneOption") }}</option><option v-for="option in bookingHandledByOptions" :key="option" :value="option">{{ option }}</option></select>
                  </label>
                  <label class="field"><span class="field-label">{{ t("adminBookingSupport.bookingDeadlineRule") }}</span><input v-model="resource.bookingDeadlineRule" class="field-input" /></label>
                  <label class="field"><span class="field-label">{{ t("adminBookingSupport.cancellationPolicy") }}</span><input v-model="resource.cancellationPolicy" class="field-input" /></label>
                  <label class="field">
                    <span class="field-label">{{ t("adminBookingSupport.settlementMode") }}</span>
                    <select v-model="resource.settlementMode" class="field-input"><option value="NONE">NONE</option><option value="PLATFORM_PREPAID">PLATFORM_PREPAID</option><option value="PLATFORM_POSTPAID">PLATFORM_POSTPAID</option></select>
                  </label>
                  <label class="field"><span class="field-label">{{ t("adminBookingSupport.subsidyRate") }}</span><input v-model.number="resource.subsidyRate" class="field-input" type="number" step="0.01" /></label>
                  <label class="field"><span class="field-label">{{ t("adminBookingSupport.subsidyCap") }}</span><input v-model.number="resource.subsidyCap" class="field-input" type="number" /></label>
                  <label class="field field--full"><span class="field-label">{{ t("adminBookingSupport.summaryText") }}</span><input v-model="resource.summaryText" class="field-input" /></label>
                  <label class="field field--full"><span class="field-label">{{ t("adminBookingSupport.detailRules") }}</span><textarea v-model="resource.detailRulesText" class="field-input field-textarea"></textarea></label>
                </div>
              </article>
            </div>

            <Button
              appearance="pill"
              size="sm"
              type="button"
              :disabled="replaceEventResourcesMutation.isPending.value || selectedEventId === null || hasEventResourceLocationValidationError"
              @click="handleSaveEventResources"
            >
              {{ replaceEventResourcesMutation.isPending.value ? t("adminBookingSupport.saving") : t("adminBookingSupport.saveEventResources") }}
            </Button>
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
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  type AdminAnchorEventWorkspaceResponse,
  useAdminAnchorEventWorkspace,
} from "@/domains/admin/queries/useAdminAnchorEvents";
import {
  type AdminBookingSupportConfigResponse,
  type EventSupportResourceInput,
  useAdminBookingSupportConfig,
  useReplaceEventBookingSupportResources,
} from "@/domains/admin/queries/useAdminBookingSupport";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";
import { formatLocalDateTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";

type EditableEventResource = EventSupportResourceInput & { detailRulesText: string };
type AdminConfig = NonNullable<AdminBookingSupportConfigResponse>;
type AdminEventResource = AdminConfig["resources"][number];
type AdminWorkspace = NonNullable<AdminAnchorEventWorkspaceResponse>;
type AdminAnchorEventRecord = AdminWorkspace["events"][number];

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminAnchorEventWorkspace(isAdmin);
const replaceEventResourcesMutation = useReplaceEventBookingSupportResources();
const selectedEventIdRaw = ref("");
const editableResources = ref<EditableEventResource[]>([]);
const bookingHandledByOptions = [
  "PLATFORM",
  "PLATFORM_PASSTHROUGH",
  "USER",
] as const;

const selectedEventId = computed<number | null>(() => {
  const parsed = Number(selectedEventIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});
const anchorEvents = computed<AdminAnchorEventRecord[]>(
  () => workspaceQuery.data.value?.events ?? [],
);
const selectedEvent = computed<AdminAnchorEventRecord | null>(
  () =>
    anchorEvents.value.find((event) => event.id === selectedEventId.value) ?? null,
);
const configQuery = useAdminBookingSupportConfig(selectedEventId);
const config = computed(() => configQuery.data.value ?? null);
const pageError = computed(() => workspaceQuery.error.value ?? configQuery.error.value ?? null);
const availableLocationOptions = computed<string[]>(() => {
  const event = selectedEvent.value;
  if (!event) return [];

  const allLocationIds = [
    ...event.systemLocationPool,
    ...event.userLocationPool.map((entry) => entry.id),
  ]
    .map((locationId) => locationId.trim())
    .filter((locationId) => locationId.length > 0);

  return Array.from(new Set(allLocationIds));
});

const toEventResource = (resource: AdminEventResource): EditableEventResource => ({
  code: resource.code,
  title: resource.title,
  resourceKind: resource.resourceKind,
  appliesToAllLocations: resource.appliesToAllLocations,
  locationIds: [...resource.locationIds],
  bookingRequired: resource.bookingRequired,
  bookingHandledBy: resource.bookingHandledBy,
  bookingDeadlineRule: resource.bookingDeadlineRule ?? null,
  bookingLocksParticipant: resource.bookingLocksParticipant,
  cancellationPolicy: resource.cancellationPolicy ?? null,
  settlementMode: resource.settlementMode,
  subsidyRate: resource.subsidyRate ?? null,
  subsidyCap: resource.subsidyCap ?? null,
  requiresUserTransferToPlatform: resource.requiresUserTransferToPlatform,
  summaryText: resource.summaryText,
  detailRules: [...resource.detailRules],
  detailRulesText: resource.detailRules.join("\n"),
  displayOrder: resource.displayOrder,
});

watch([anchorEvents, isAdmin], ([events, adminReady]) => {
  if (!adminReady || events.length === 0) {
    selectedEventIdRaw.value = "";
    return;
  }
  if (!events.some((event) => String(event.id) === selectedEventIdRaw.value)) {
    selectedEventIdRaw.value = String(events[0].id);
  }
}, { immediate: true });

watch(config, (nextConfig) => {
  editableResources.value = nextConfig?.resources.map(toEventResource) ?? [];
}, { immediate: true });

const splitLines = (value: string): string[] => value.split("\n").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
const resolveSelectedLocations = (locationIds: string[]): string[] => {
  const options = new Set(availableLocationOptions.value);
  return locationIds.filter((location) => options.has(location));
};
const invalidResourceLocationIndexes = computed<number[]>(() =>
  editableResources.value.flatMap((resource, index) => {
    if (resource.appliesToAllLocations) return [];
    return resolveSelectedLocations(resource.locationIds).length > 0 ? [] : [index];
  }),
);
const hasEventResourceLocationValidationError = computed(
  () => invalidResourceLocationIndexes.value.length > 0,
);
const hasResourceLocationValidationError = (index: number): boolean =>
  invalidResourceLocationIndexes.value.includes(index);

const handleSaveEventResources = async () => {
  if (
    selectedEventId.value === null ||
    hasEventResourceLocationValidationError.value
  ) {
    return;
  }
  await replaceEventResourcesMutation.mutateAsync({
    eventId: selectedEventId.value,
    resources: editableResources.value.map((resource) => ({
      code: resource.code.trim(),
      title: resource.title.trim(),
      resourceKind: resource.resourceKind,
      appliesToAllLocations: resource.appliesToAllLocations,
      locationIds: resource.appliesToAllLocations
        ? []
        : resolveSelectedLocations(resource.locationIds),
      bookingRequired: resource.bookingRequired,
      bookingHandledBy: resource.bookingRequired ? resource.bookingHandledBy : null,
      bookingDeadlineRule: resource.bookingRequired ? (resource.bookingDeadlineRule?.trim() || null) : null,
      bookingLocksParticipant: resource.bookingLocksParticipant,
      cancellationPolicy: resource.cancellationPolicy?.trim() || null,
      settlementMode: resource.settlementMode,
      subsidyRate: resource.subsidyRate ?? null,
      subsidyCap: resource.subsidyCap ?? null,
      requiresUserTransferToPlatform: resource.requiresUserTransferToPlatform,
      summaryText: resource.summaryText.trim(),
      detailRules: splitLines(resource.detailRulesText),
      displayOrder: resource.displayOrder,
    })),
  });
};

const addEventResource = () => editableResources.value.push({
  code: "", title: "", resourceKind: "ITEM", appliesToAllLocations: true, locationIds: [],
  bookingRequired: false, bookingHandledBy: null, bookingDeadlineRule: null, bookingLocksParticipant: false,
  cancellationPolicy: null, settlementMode: "NONE", subsidyRate: null, subsidyCap: null,
  requiresUserTransferToPlatform: false, summaryText: "", detailRules: [], detailRulesText: "", displayOrder: editableResources.value.length,
});
const removeEventResource = (index: number) => { editableResources.value.splice(index, 1); };
</script>

<style lang="scss" scoped>
.sidebar,
.stack,
.header,
.editor-list,
.editor-block {
  display: flex;
  flex-direction: column;
}

.sidebar,
.stack,
.header,
.editor-list {
  gap: var(--sys-spacing-med);
}

.editor-block {
  gap: var(--sys-spacing-med);
  padding: var(--sys-spacing-med);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface);
}

.header {
  gap: var(--sys-spacing-xs);
}

.title,
.subtitle,
.card-title {
  margin: 0;
}

.title {
  @include mx.pu-font(headline-small);
}

.subtitle {
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
  @include mx.pu-font(title-medium);
}

.section-header,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-spacing-sm);
}

.field,
.checkbox-field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.checkbox-field {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  min-height: var(--sys-size-large);
}

.field--full {
  grid-column: 1 / -1;
}

.field--compact {
  min-width: 240px;
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
  min-height: 100px;
  resize: vertical;
}

.field-input--multiselect {
  min-height: 128px;
}

.hint {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.field-error {
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

</style>
