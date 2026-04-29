<template>
  <DesktopPageScaffold class="page">
    <template #aside>
      <div class="sidebar">
        <AdminNavigationCard show-logout @logout="logout" />

        <section class="panel">
          <div class="stack">
            <h2 class="card-title">{{ t("adminPois.poiListTitle") }}</h2>
            <p class="hint">{{ t("adminPois.poiCount", { count: pois.length }) }}</p>

            <label class="field">
              <span class="field-label">{{ t("adminPois.poiLabel") }}</span>
              <select v-model="selectedPoiIdRaw" class="field-input">
                <option value="">{{ t("adminPois.poiPlaceholder") }}</option>
                <option v-for="poi in pois" :key="poi.id" :value="poi.id">
                  {{ poi.id }}
                </option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">{{ t("adminPois.newPoiLabel") }}</span>
              <div class="action-row">
                <input
                  v-model="newPoiId"
                  class="field-input"
                  :placeholder="t('adminPois.newPoiPlaceholder')"
                />
                <Button
                  appearance="pill"
                  tone="outline"
                  size="sm"
                  type="button"
                  :disabled="isCreatingPoi || !canCreatePoi"
                  @click="handleCreatePoi"
                >
                  {{
                    isCreatingPoi
                      ? t("adminPois.creatingPoi")
                      : t("adminPois.createPoiAction")
                  }}
                </Button>
              </div>
            </label>

            <label class="field">
              <span class="field-label">{{ t("adminPois.perTimeWindowCapLabel") }}</span>
              <input
                v-model="selectedPoiCapText"
                class="field-input"
                type="number"
                min="1"
                :disabled="selectedPoiId === null"
                :placeholder="t('adminPois.perTimeWindowCapPlaceholder')"
              />
            </label>

            <Button
              appearance="pill"
              size="sm"
              type="button"
              :disabled="selectedPoiId === null || isSavingPoi"
              @click="handleSavePoi"
            >
              {{
                isSavingPoi
                  ? t("adminPois.savingPoi")
                  : t("adminPois.savePoiAction")
              }}
            </Button>
          </div>
        </section>
      </div>
    </template>

    <template #header>
      <header class="header">
        <h1 class="title">{{ t("adminPois.title") }}</h1>
        <p class="subtitle">{{ t("adminPois.subtitle") }}</p>
      </header>
    </template>

    <div class="stack">
      <LoadingIndicator v-if="poisQuery.isLoading.value" :message="t('common.loading')" />
      <ErrorToast v-else-if="pageError" :message="pageError.message" persistent />

      <template v-else-if="pois.length === 0">
        <section class="panel">
          {{ t("adminPois.emptyPois") }}
        </section>
      </template>

      <template v-else>
        <section class="panel">
          <div class="section-header">
            <h2 class="card-title">
              {{ t("adminPois.galleryTitle") }} · {{ selectedPoiId ?? "-" }}
            </h2>
            <p class="hint">
              {{ t("adminPois.galleryCount", { count: selectedPoiGallery.length }) }}
            </p>
          </div>

          <div class="action-row">
            <Button
              appearance="pill"
              tone="outline"
              size="sm"
              type="button"
              :disabled="selectedPoiId === null || isUploadingGalleryImage"
              @click="handleChooseGalleryImage"
            >
              {{
                isUploadingGalleryImage
                  ? t("adminPois.uploadingImage")
                  : t("adminPois.uploadImageAction")
              }}
            </Button>
          </div>

          <input
            ref="galleryInputRef"
            class="hidden-input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            @change="handleGalleryFileChange"
          />

          <label class="field">
            <span class="field-label">{{ t("adminPois.galleryHint") }}</span>
            <div class="manual-url-row">
              <input
                v-model="manualGalleryUrl"
                class="field-input"
                :placeholder="t('adminPois.manualUrlPlaceholder')"
              />
              <Button
                appearance="pill"
                tone="outline"
                size="sm"
                type="button"
                :disabled="selectedPoiId === null"
                @click="handleAddManualUrl"
              >
                {{ t("adminPois.addUrlAction") }}
              </Button>
            </div>
          </label>

          <p v-if="selectedPoiGallery.length === 0" class="hint">
            {{ t("adminPois.emptyGallery") }}
          </p>
          <div v-else class="gallery-grid">
            <article
              v-for="(imageUrl, index) in selectedPoiGallery"
              :key="`${selectedPoiId ?? 'poi'}-gallery-${index}`"
              class="gallery-item"
            >
              <img
                :src="imageUrl"
                :alt="t('adminPois.imageAlt', { index: index + 1, poiId: selectedPoiId ?? '' })"
                class="gallery-image"
              />
              <p class="gallery-url">{{ imageUrl }}</p>
              <Button
                tone="danger"
                size="sm"
                type="button"
                @click="handleRemoveGalleryImage(index)"
              >
                {{ t("adminPois.removeImageAction") }}
              </Button>
            </article>
          </div>
        </section>

        <section class="panel availability-card">
          <div class="section-header">
            <h2 class="card-title">
              {{ t("adminPois.availabilityRulesTitle") }} · {{ selectedPoiId ?? "-" }}
            </h2>
            <Button
              appearance="pill"
              tone="outline"
              size="sm"
              type="button"
              :disabled="selectedPoiId === null"
              @click="handleAddAvailabilityRule"
            >
              {{ t("adminPois.addAvailabilityRuleAction") }}
            </Button>
          </div>

          <p v-if="selectedPoiAvailabilityRules.length === 0" class="hint">
            {{ t("adminPois.emptyAvailabilityRules") }}
          </p>

          <article
            v-for="(rule, index) in selectedPoiAvailabilityRules"
            :key="rule.id"
            class="availability-rule"
          >
            <div class="action-row">
              <strong>
                {{ t("adminPois.availabilityRuleTitle", { index: index + 1 }) }}
              </strong>
              <Button
                tone="danger"
                size="sm"
                type="button"
                @click="handleRemoveAvailabilityRule(index)"
              >
                {{ t("adminPois.removeRuleAction") }}
              </Button>
            </div>

            <div class="grid">
              <label class="field">
                <span class="field-label">{{ t("adminPois.ruleModeLabel") }}</span>
                <select
                  v-model="rule.mode"
                  class="field-input"
                  @change="markSelectedPoiDirty"
                >
                  <option value="INCLUDE">{{ t("adminPois.ruleModeInclude") }}</option>
                  <option value="EXCLUDE">{{ t("adminPois.ruleModeExclude") }}</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPois.ruleKindLabel") }}</span>
                <select
                  v-model="rule.kind"
                  class="field-input"
                  @change="markSelectedPoiDirty"
                >
                  <option value="ABSOLUTE">{{ t("adminPois.ruleKindAbsolute") }}</option>
                  <option value="RECURRING">{{ t("adminPois.ruleKindRecurring") }}</option>
                </select>
              </label>

              <template v-if="rule.kind === 'ABSOLUTE'">
                <label class="field">
                  <span class="field-label">{{ t("adminPois.ruleStartAtLabel") }}</span>
                  <input
                    v-model="rule.startAtLocal"
                    class="field-input"
                    type="datetime-local"
                    @input="markSelectedPoiDirty"
                  />
                </label>

                <label class="field">
                  <span class="field-label">{{ t("adminPois.ruleEndAtLabel") }}</span>
                  <input
                    v-model="rule.endAtLocal"
                    class="field-input"
                    type="datetime-local"
                    @input="markSelectedPoiDirty"
                  />
                </label>
              </template>

              <template v-else>
                <label class="field">
                  <span class="field-label">{{ t("adminPois.ruleFrequencyLabel") }}</span>
                  <select
                    v-model="rule.frequency"
                    class="field-input"
                    @change="markSelectedPoiDirty"
                  >
                    <option value="DAILY">{{ t("adminPois.frequencyDaily") }}</option>
                    <option value="WEEKLY">{{ t("adminPois.frequencyWeekly") }}</option>
                    <option value="MONTHLY">{{ t("adminPois.frequencyMonthly") }}</option>
                    <option value="YEARLY">{{ t("adminPois.frequencyYearly") }}</option>
                  </select>
                </label>

                <label class="field">
                  <span class="field-label">{{ t("adminPois.ruleStartTimeLabel") }}</span>
                  <input
                    v-model="rule.startTime"
                    class="field-input"
                    type="time"
                    @input="markSelectedPoiDirty"
                  />
                </label>

                <label class="field">
                  <span class="field-label">{{ t("adminPois.ruleEndTimeLabel") }}</span>
                  <input
                    v-model="rule.endTime"
                    class="field-input"
                    type="time"
                    @input="markSelectedPoiDirty"
                  />
                </label>

                <label v-if="rule.frequency === 'WEEKLY'" class="field field--full">
                  <span class="field-label">{{ t("adminPois.ruleWeekdaysLabel") }}</span>
                  <div class="weekday-grid">
                    <label
                      v-for="weekday in weekdayOptions"
                      :key="weekday.value"
                      class="checkbox-field"
                    >
                      <input
                        v-model="rule.weekdays"
                        type="checkbox"
                        :value="weekday.value"
                        @change="markSelectedPoiDirty"
                      />
                      <span>{{ weekday.label }}</span>
                    </label>
                  </div>
                </label>

                <label
                  v-if="rule.frequency === 'MONTHLY' || rule.frequency === 'YEARLY'"
                  class="field"
                >
                  <span class="field-label">{{ t("adminPois.ruleMonthDaysLabel") }}</span>
                  <input
                    v-model="rule.monthDaysText"
                    class="field-input"
                    :placeholder="t('adminPois.ruleNumberListPlaceholder')"
                    @input="markSelectedPoiDirty"
                  />
                </label>

                <label v-if="rule.frequency === 'YEARLY'" class="field">
                  <span class="field-label">{{ t("adminPois.ruleMonthsLabel") }}</span>
                  <input
                    v-model="rule.monthsText"
                    class="field-input"
                    :placeholder="t('adminPois.ruleNumberListPlaceholder')"
                    @input="markSelectedPoiDirty"
                  />
                </label>
              </template>
            </div>
          </article>
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
  useAdminPois,
  useUpsertAdminPoi,
  type AdminPoiAvailabilityRulesInput,
  type AdminPoisResponse,
} from "@/domains/admin/queries/useAdminPoiManagement";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";
import { useCloudStorage } from "@/shared/upload/useCloudStorage";

type PoiRecord = NonNullable<AdminPoisResponse>[number];
type PoiGalleryMap = Record<string, string[]>;
type PoiCapMap = Record<string, number | null>;
type PoiAvailabilityRuleInput = AdminPoiAvailabilityRulesInput[number];
type EditableAvailabilityRule = {
  id: string;
  mode: "INCLUDE" | "EXCLUDE";
  kind: "ABSOLUTE" | "RECURRING";
  startAtLocal: string;
  endAtLocal: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startTime: string;
  endTime: string;
  weekdays: number[];
  monthDaysText: string;
  monthsText: string;
};
type PoiAvailabilityRulesMap = Record<string, EditableAvailabilityRule[]>;

const PRODUCT_TIME_ZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

const weekdayOptions = [
  { value: 0, label: "周日" },
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
] as const;

const normalizeGallery = (gallery: string[]): string[] => {
  const normalized = new Set<string>();
  for (const raw of gallery) {
    const item = raw.trim();
    if (!item) continue;
    normalized.add(item);
  }
  return Array.from(normalized);
};

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const poisQuery = useAdminPois(isAdmin);
const upsertPoiMutation = useUpsertAdminPoi();
const { uploadFile, isUploading: isUploadingGalleryImage } = useCloudStorage();

const selectedPoiIdRaw = ref("");
const newPoiId = ref("");
const manualGalleryUrl = ref("");
const galleryInputRef = ref<HTMLInputElement | null>(null);
const poiGalleryById = ref<PoiGalleryMap>({});
const poiCapById = ref<PoiCapMap>({});
const poiAvailabilityRulesById = ref<PoiAvailabilityRulesMap>({});
const dirtyPoiIds = ref<Set<string>>(new Set());
const poiMutationAction = ref<"create" | "save-poi" | null>(null);

const pois = computed<PoiRecord[]>(() => poisQuery.data.value ?? []);
const poiIdSet = computed<Set<string>>(() => new Set(pois.value.map((poi) => poi.id)));
const selectedPoiId = computed<string | null>(() => {
  const rawId = selectedPoiIdRaw.value.trim();
  if (!rawId) return null;
  return poiIdSet.value.has(rawId) ? rawId : null;
});
const selectedPoiGallery = computed<string[]>(() => {
  const poiId = selectedPoiId.value;
  if (!poiId) return [];
  return poiGalleryById.value[poiId] ?? [];
});
const normalizeNullablePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
const selectedPoiCap = computed<number | null>(() => {
  const poiId = selectedPoiId.value;
  if (!poiId) return null;
  return poiCapById.value[poiId] ?? null;
});
const selectedPoiCapText = computed<string>({
  get: () => (selectedPoiCap.value === null ? "" : String(selectedPoiCap.value)),
  set: (value) => {
    setSelectedPoiCap(normalizeNullablePositiveInteger(value));
  },
});
const selectedPoiAvailabilityRules = computed<EditableAvailabilityRule[]>(() => {
  const poiId = selectedPoiId.value;
  if (!poiId) return [];
  return poiAvailabilityRulesById.value[poiId] ?? [];
});
const canCreatePoi = computed(() => {
  const poiId = newPoiId.value.trim();
  if (!poiId) return false;
  return !poiIdSet.value.has(poiId);
});
const isCreatingPoi = computed(
  () => upsertPoiMutation.isPending.value && poiMutationAction.value === "create",
);
const isSavingPoi = computed(
  () =>
    upsertPoiMutation.isPending.value &&
    poiMutationAction.value === "save-poi",
);
const pageError = computed(() => poisQuery.error.value ?? upsertPoiMutation.error.value ?? null);

const setSelectedPoiGallery = (
  gallery: string[],
  options?: { markDirty?: boolean },
) => {
  const poiId = selectedPoiId.value;
  if (!poiId) return;

  const markDirty = options?.markDirty ?? true;
  poiGalleryById.value = {
    ...poiGalleryById.value,
    [poiId]: normalizeGallery(gallery),
  };
  if (markDirty) {
    const nextDirtyPoiIds = new Set(dirtyPoiIds.value);
    nextDirtyPoiIds.add(poiId);
    dirtyPoiIds.value = nextDirtyPoiIds;
  }
};

const setSelectedPoiCap = (
  perTimeWindowCap: number | null,
  options?: { markDirty?: boolean },
) => {
  const poiId = selectedPoiId.value;
  if (!poiId) return;

  const markDirty = options?.markDirty ?? true;
  poiCapById.value = {
    ...poiCapById.value,
    [poiId]: perTimeWindowCap,
  };
  if (markDirty) {
    const nextDirtyPoiIds = new Set(dirtyPoiIds.value);
    nextDirtyPoiIds.add(poiId);
    dirtyPoiIds.value = nextDirtyPoiIds;
  }
};

const markSelectedPoiDirty = () => {
  const poiId = selectedPoiId.value;
  if (!poiId) return;
  const nextDirtyPoiIds = new Set(dirtyPoiIds.value);
  nextDirtyPoiIds.add(poiId);
  dirtyPoiIds.value = nextDirtyPoiIds;
};

const toDatetimeLocalValue = (isoValue: string): string => {
  const parsed = Date.parse(isoValue);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed + PRODUCT_TIME_ZONE_OFFSET_MS)
    .toISOString()
    .slice(0, 16);
};

const fromDatetimeLocalValue = (value: string): string | null => {
  if (!value) return null;
  const parsed = new Date(`${value}:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toNumberListText = (values: readonly number[]): string =>
  values.join(",");

const parseNumberList = (
  value: string,
  min: number,
  max: number,
): number[] =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => Number(entry.trim()))
        .filter(
          (entry) => Number.isInteger(entry) && entry >= min && entry <= max,
        ),
    ),
  ).sort((left, right) => left - right);

const toEditableAvailabilityRule = (
  rule: PoiAvailabilityRuleInput,
): EditableAvailabilityRule => {
  if (rule.kind === "ABSOLUTE") {
    return {
      id: rule.id,
      mode: rule.mode,
      kind: "ABSOLUTE",
      startAtLocal: toDatetimeLocalValue(rule.startAt),
      endAtLocal: toDatetimeLocalValue(rule.endAt),
      frequency: "DAILY",
      startTime: "09:00",
      endTime: "18:00",
      weekdays: [],
      monthDaysText: "",
      monthsText: "",
    };
  }

  return {
    id: rule.id,
    mode: rule.mode,
    kind: "RECURRING",
    startAtLocal: "",
    endAtLocal: "",
    frequency: rule.frequency,
    startTime: rule.startTime,
    endTime: rule.endTime,
    weekdays: [...rule.weekdays],
    monthDaysText: toNumberListText(rule.monthDays),
    monthsText: toNumberListText(rule.months),
  };
};

const buildAvailabilityRulesInput = (
  rules: readonly EditableAvailabilityRule[],
): AdminPoiAvailabilityRulesInput =>
  rules.flatMap((rule): AdminPoiAvailabilityRulesInput => {
    if (rule.kind === "ABSOLUTE") {
      const startAt = fromDatetimeLocalValue(rule.startAtLocal);
      const endAt = fromDatetimeLocalValue(rule.endAtLocal);
      if (!startAt || !endAt || Date.parse(endAt) <= Date.parse(startAt)) {
        return [];
      }
      return [
        {
          id: rule.id,
          mode: rule.mode,
          kind: "ABSOLUTE",
          startAt,
          endAt,
        },
      ];
    }

    const monthDays = parseNumberList(rule.monthDaysText, 1, 31);
    const months = parseNumberList(rule.monthsText, 1, 12);
    if (rule.frequency === "WEEKLY" && rule.weekdays.length === 0) {
      return [];
    }
    if (rule.frequency === "MONTHLY" && monthDays.length === 0) {
      return [];
    }
    if (
      rule.frequency === "YEARLY" &&
      (monthDays.length === 0 || months.length === 0)
    ) {
      return [];
    }

    return [
      {
        id: rule.id,
        mode: rule.mode,
        kind: "RECURRING",
        frequency: rule.frequency,
        startTime: rule.startTime || "09:00",
        endTime: rule.endTime || "18:00",
        weekdays: rule.frequency === "WEEKLY" ? [...rule.weekdays] : [],
        monthDays:
          rule.frequency === "MONTHLY" || rule.frequency === "YEARLY"
            ? monthDays
            : [],
        months: rule.frequency === "YEARLY" ? months : [],
      },
    ];
  });

const setSelectedPoiAvailabilityRules = (
  rules: EditableAvailabilityRule[],
  options?: { markDirty?: boolean },
) => {
  const poiId = selectedPoiId.value;
  if (!poiId) return;

  poiAvailabilityRulesById.value = {
    ...poiAvailabilityRulesById.value,
    [poiId]: rules,
  };
  if (options?.markDirty ?? true) {
    markSelectedPoiDirty();
  }
};

watch([pois, isAdmin], ([nextPois, adminReady]) => {
  if (!adminReady || nextPois.length === 0) {
    selectedPoiIdRaw.value = "";
    return;
  }
  if (!nextPois.some((poi) => poi.id === selectedPoiIdRaw.value)) {
    selectedPoiIdRaw.value = nextPois[0].id;
  }
}, { immediate: true });

watch(pois, (nextPois) => {
  const nextMap: PoiGalleryMap = {};
  const nextCapMap: PoiCapMap = {};
  const nextAvailabilityRulesMap: PoiAvailabilityRulesMap = {};
  const nextDirtyPoiIds = new Set<string>();

  for (const poi of nextPois) {
    const isDirty = dirtyPoiIds.value.has(poi.id);
    const localGallery = poiGalleryById.value[poi.id];
    const localCap = poiCapById.value[poi.id];
    const localAvailabilityRules = poiAvailabilityRulesById.value[poi.id];
    if (isDirty && localGallery !== undefined) {
      nextMap[poi.id] = normalizeGallery(localGallery);
      nextCapMap[poi.id] = localCap ?? null;
      nextAvailabilityRulesMap[poi.id] = localAvailabilityRules ?? [];
      nextDirtyPoiIds.add(poi.id);
      continue;
    }
    nextMap[poi.id] = normalizeGallery(poi.gallery);
    nextCapMap[poi.id] = poi.perTimeWindowCap ?? null;
    nextAvailabilityRulesMap[poi.id] =
      poi.availabilityRules.map(toEditableAvailabilityRule);
  }

  poiGalleryById.value = nextMap;
  poiCapById.value = nextCapMap;
  poiAvailabilityRulesById.value = nextAvailabilityRulesMap;
  dirtyPoiIds.value = nextDirtyPoiIds;
}, { immediate: true });

const handleCreatePoi = async () => {
  const poiId = newPoiId.value.trim();
  if (!poiId || poiIdSet.value.has(poiId)) return;

  poiMutationAction.value = "create";
  try {
    const result = await upsertPoiMutation.mutateAsync({
      poiId,
      gallery: [],
      perTimeWindowCap: null,
      availabilityRules: [],
    });
    selectedPoiIdRaw.value = result.id;
    newPoiId.value = "";
  } finally {
    poiMutationAction.value = null;
  }
};

const handleAddManualUrl = () => {
  const url = manualGalleryUrl.value.trim();
  if (!url) return;
  setSelectedPoiGallery([...selectedPoiGallery.value, url]);
  manualGalleryUrl.value = "";
};

const handleChooseGalleryImage = () => {
  galleryInputRef.value?.click();
};

const handleGalleryFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  if (!file || selectedPoiId.value === null) {
    if (target) target.value = "";
    return;
  }

  try {
    const uploadedUrl = await uploadFile(file, `poi-${selectedPoiId.value}.png`);
    setSelectedPoiGallery([...selectedPoiGallery.value, uploadedUrl]);
  } finally {
    if (target) {
      target.value = "";
    }
  }
};

const handleRemoveGalleryImage = (index: number) => {
  const currentGallery = [...selectedPoiGallery.value];
  if (index < 0 || index >= currentGallery.length) return;
  currentGallery.splice(index, 1);
  setSelectedPoiGallery(currentGallery);
};

const handleAddAvailabilityRule = () => {
  const now = Date.now();
  setSelectedPoiAvailabilityRules([
    ...selectedPoiAvailabilityRules.value,
    {
      id: `rule-${now}`,
      mode: "INCLUDE",
      kind: "RECURRING",
      startAtLocal: "",
      endAtLocal: "",
      frequency: "WEEKLY",
      startTime: "09:00",
      endTime: "18:00",
      weekdays: [5, 6, 0],
      monthDaysText: "",
      monthsText: "",
    },
  ]);
};

const handleRemoveAvailabilityRule = (index: number) => {
  const rules = [...selectedPoiAvailabilityRules.value];
  if (index < 0 || index >= rules.length) return;
  rules.splice(index, 1);
  setSelectedPoiAvailabilityRules(rules);
};

const handleSavePoi = async () => {
  const poiId = selectedPoiId.value;
  if (!poiId) return;

  poiMutationAction.value = "save-poi";
  try {
    const result = await upsertPoiMutation.mutateAsync({
      poiId,
      gallery: normalizeGallery(selectedPoiGallery.value),
      perTimeWindowCap: selectedPoiCap.value,
      availabilityRules: buildAvailabilityRulesInput(
        selectedPoiAvailabilityRules.value,
      ),
    });
    setSelectedPoiGallery(result.gallery, { markDirty: false });
    setSelectedPoiCap(result.perTimeWindowCap ?? null, { markDirty: false });
    setSelectedPoiAvailabilityRules(
      result.availabilityRules.map(toEditableAvailabilityRule),
      { markDirty: false },
    );
    const nextDirtyPoiIds = new Set(dirtyPoiIds.value);
    nextDirtyPoiIds.delete(poiId);
    dirtyPoiIds.value = nextDirtyPoiIds;
  } finally {
    poiMutationAction.value = null;
  }
};
</script>

<style lang="scss" scoped>
.page,
.sidebar,
.stack,
.header {
  display: flex;
  flex-direction: column;
}

.sidebar,
.stack,
.header {
  gap: var(--sys-spacing-medium);
}

.header {
  gap: var(--sys-spacing-xsmall);
}

.title,
.subtitle,
.card-title,
.hint {
  margin: 0;
}

.title {
  @include mx.pu-font(headline-small);
}

.subtitle,
.hint {
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
  @include mx.pu-font(title-medium);
}

.section-header,
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
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

.availability-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.availability-rule {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.weekday-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(5.5rem, 1fr));
  gap: var(--sys-spacing-xsmall);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  min-height: 2.25rem;
  padding: 0 var(--sys-spacing-xsmall);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container);
  @include mx.pu-font(body-small);
}

.manual-url-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-small);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--sys-spacing-small);
}

.gallery-item {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface);
}

.gallery-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: var(--sys-shape-corner-medium);
  background: var(--sys-color-surface-container);
}

.gallery-url {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
  word-break: break-all;
}

.hidden-input {
  display: none;
}

@media (max-width: 720px) {
  .grid,
  .manual-url-row {
    grid-template-columns: 1fr;
  }
}
</style>
