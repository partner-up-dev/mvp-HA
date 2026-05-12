<template>
  <div class="stack">
    <LoadingIndicator
      v-if="configQuery.isLoading.value"
      :message="t('common.loading')"
    />
    <ErrorToast v-else-if="pageError" :message="pageError.message" persistent />

    <BentoLayout v-else-if="config">
      <BentoItem
        :title="t('adminBookingSupport.eventResourcesTitle')"
        span="full"
      >
        <div class="stack">
          <div class="section-header">
            <Button
              appearance="pill"
              tone="outline"
              size="sm"
              type="button"
              @click="addEventResource"
            >
              {{ t("adminBookingSupport.addResourceAction") }}
            </Button>
          </div>

          <div class="editor-list">
            <article
              v-for="(resource, index) in editableResources"
              :key="`resource-${index}`"
              class="editor-block"
            >
              <div class="action-row">
                <strong>
                  {{
                    resource.title ||
                    `${t("adminBookingSupport.resourceFallback")} ${index + 1}`
                  }}
                </strong>
                <Button
                  tone="danger"
                  size="sm"
                  type="button"
                  @click="removeEventResource(index)"
                >
                  {{ t("adminBookingSupport.removeAction") }}
                </Button>
              </div>

              <div class="grid">
                <label class="field">
                  <span class="field-label">code</span>
                  <input v-model="resource.code" class="field-input" />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminBookingSupport.resourceTitle")
                  }}</span>
                  <input v-model="resource.title" class="field-input" />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminBookingSupport.resourceKind")
                  }}</span>
                  <select v-model="resource.resourceKind" class="field-input">
                    <option value="VENUE">VENUE</option>
                    <option value="ITEM">ITEM</option>
                    <option value="SERVICE">SERVICE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminBookingSupport.displayOrder")
                  }}</span>
                  <input
                    v-model.number="resource.displayOrder"
                    class="field-input"
                    type="number"
                  />
                </label>
                <label class="checkbox-field">
                  <input v-model="resource.appliesToAllLocations" type="checkbox" />
                  <span>{{ t("adminBookingSupport.appliesToAllLocations") }}</span>
                </label>
                <label class="checkbox-field">
                  <input v-model="resource.bookingRequired" type="checkbox" />
                  <span>{{ t("adminBookingSupport.bookingRequired") }}</span>
                </label>
                <label class="checkbox-field">
                  <input
                    v-model="resource.bookingLocksParticipant"
                    type="checkbox"
                  />
                  <span>{{ t("adminBookingSupport.bookingLocksParticipant") }}</span>
                </label>
                <label class="checkbox-field">
                  <input
                    v-model="resource.requiresUserTransferToPlatform"
                    type="checkbox"
                  />
                  <span>{{ t("adminBookingSupport.requiresTransfer") }}</span>
                </label>
                <label class="field field--full">
                  <span class="field-label">{{
                    t("adminBookingSupport.locationIds")
                  }}</span>
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
                  <span class="field-label">{{
                    t("adminBookingSupport.bookingHandledBy")
                  }}</span>
                  <select
                    v-model="resource.bookingHandledBy"
                    class="field-input"
                  >
                    <option :value="null">
                      {{ t("adminBookingSupport.noneOption") }}
                    </option>
                    <option
                      v-for="option in bookingHandledByOptions"
                      :key="option"
                      :value="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminBookingSupport.bookingDeadlineRule")
                  }}</span>
                  <input
                    v-model="resource.bookingDeadlineRule"
                    class="field-input"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminBookingSupport.cancellationPolicy")
                  }}</span>
                  <input
                    v-model="resource.cancellationPolicy"
                    class="field-input"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminBookingSupport.settlementMode")
                  }}</span>
                  <select v-model="resource.settlementMode" class="field-input">
                    <option value="NONE">NONE</option>
                    <option value="PLATFORM_PREPAID">PLATFORM_PREPAID</option>
                    <option value="PLATFORM_POSTPAID">PLATFORM_POSTPAID</option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminBookingSupport.subsidyRate")
                  }}</span>
                  <input
                    v-model.number="resource.subsidyRate"
                    class="field-input"
                    type="number"
                    step="0.01"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{
                    t("adminBookingSupport.subsidyCap")
                  }}</span>
                  <input
                    v-model.number="resource.subsidyCap"
                    class="field-input"
                    type="number"
                  />
                </label>
                <label class="field field--full">
                  <span class="field-label">{{
                    t("adminBookingSupport.summaryText")
                  }}</span>
                  <input v-model="resource.summaryText" class="field-input" />
                </label>
                <label class="field field--full">
                  <span class="field-label">{{
                    t("adminBookingSupport.detailRules")
                  }}</span>
                  <textarea
                    v-model="resource.detailRulesText"
                    class="field-input field-textarea"
                  ></textarea>
                </label>
              </div>

              <PRJoinGateConfigEditor
                v-model="resource.joinGateConfig"
                source="PR_SUPPORT_RESOURCE"
              />
            </article>
          </div>

          <Button
            appearance="pill"
            size="sm"
            type="button"
            :disabled="
              supportResourceConfig.isPending.replaceResources.value ||
              selectedEventId === null ||
              hasEventResourceLocationValidationError
            "
            @click="handleSaveEventResources"
          >
            {{
              supportResourceConfig.isPending.replaceResources.value
                ? t("adminBookingSupport.saving")
                : t("adminBookingSupport.saveEventResources")
            }}
          </Button>
        </div>
      </BentoItem>
    </BentoLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import {
  bookingHandledByOptions,
  buildSupportResourceInputs,
  createEmptySupportResource,
  type EditableSupportResource,
  toEditableSupportResource,
  useAdminSupportResourceConfig,
} from "@/domains/admin/use-cases/support-resource/useAdminSupportResourceConfig";
import PRJoinGateConfigEditor from "@/domains/pr/ui/forms/PRJoinGateConfigEditor.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";

const props = defineProps<{
  selectedEventId: number | null;
  availableLocationOptions: string[];
  isAdmin: boolean;
}>();

const { t } = useI18n();
const editableResources = ref<EditableSupportResource[]>([]);
const selectedEventId = toRef(props, "selectedEventId");
const isAdmin = toRef(props, "isAdmin");
const supportResourceConfig = useAdminSupportResourceConfig(
  selectedEventId,
  isAdmin,
);
const configQuery = supportResourceConfig.configQuery;
const config = computed(() => configQuery.data.value ?? null);
const pageError = computed(() => configQuery.error.value ?? null);

watch(
  config,
  (nextConfig) => {
    editableResources.value =
      nextConfig?.resources.map(toEditableSupportResource) ?? [];
  },
  { immediate: true },
);

const resolveSelectedLocations = (locationIds: string[]): string[] => {
  const options = new Set(props.availableLocationOptions);
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

  await supportResourceConfig.replaceResources({
    eventId: selectedEventId.value,
    resources: buildSupportResourceInputs(
      editableResources.value,
      resolveSelectedLocations,
    ),
  });
};

const addEventResource = () => {
  editableResources.value.push(
    createEmptySupportResource(editableResources.value.length),
  );
};

const removeEventResource = (index: number) => {
  editableResources.value.splice(index, 1);
};
</script>

<style lang="scss" scoped>
.stack,
.editor-list,
.editor-block {
  display: flex;
  flex-direction: column;
}

.stack,
.editor-list,
.editor-block {
  gap: var(--sys-spacing-medium);
}

.editor-block {
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface);
}

.section-header,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-spacing-small);
}

.field,
.checkbox-field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
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

.field-label {
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
