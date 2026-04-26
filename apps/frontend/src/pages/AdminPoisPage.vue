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

      <section v-else class="panel">
        <div v-if="pois.length === 0" class="hint">
          {{ t("adminPois.emptyPois") }}
        </div>
        <div v-else class="stack">
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
            <Button
              appearance="pill"
              size="sm"
              type="button"
              :disabled="selectedPoiId === null || isSavingGallery"
              @click="handleSaveGallery"
            >
              {{
                isSavingGallery
                  ? t("adminPois.savingGallery")
                  : t("adminPois.saveGalleryAction")
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
        </div>
      </section>
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
const dirtyPoiIds = ref<Set<string>>(new Set());
const poiMutationAction = ref<"create" | "save-gallery" | null>(null);

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
const canCreatePoi = computed(() => {
  const poiId = newPoiId.value.trim();
  if (!poiId) return false;
  return !poiIdSet.value.has(poiId);
});
const isCreatingPoi = computed(
  () => upsertPoiMutation.isPending.value && poiMutationAction.value === "create",
);
const isSavingGallery = computed(
  () =>
    upsertPoiMutation.isPending.value &&
    poiMutationAction.value === "save-gallery",
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
  const nextDirtyPoiIds = new Set<string>();

  for (const poi of nextPois) {
    const isDirty = dirtyPoiIds.value.has(poi.id);
    const localGallery = poiGalleryById.value[poi.id];
    if (isDirty && localGallery !== undefined) {
      nextMap[poi.id] = normalizeGallery(localGallery);
      nextDirtyPoiIds.add(poi.id);
      continue;
    }
    nextMap[poi.id] = normalizeGallery(poi.gallery);
  }

  poiGalleryById.value = nextMap;
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

const handleSaveGallery = async () => {
  const poiId = selectedPoiId.value;
  if (!poiId) return;

  poiMutationAction.value = "save-gallery";
  try {
    const result = await upsertPoiMutation.mutateAsync({
      poiId,
      gallery: normalizeGallery(selectedPoiGallery.value),
    });
    setSelectedPoiGallery(result.gallery, { markDirty: false });
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
</style>
