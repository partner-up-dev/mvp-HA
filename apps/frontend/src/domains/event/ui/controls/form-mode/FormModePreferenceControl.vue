<template>
  <section class="form-mode-preference-control">
    <Cell
      as="button"
      class="preference-cell"
      type="button"
      :title="t('anchorEvent.formMode.preferencePlaceholder')"
      :value="preferenceCellValue"
      suffix-icon="i-mdi-chevron-right"
      @click="openPreferenceDrawer"
    />

    <p
      v-if="preferenceSubmissionMessage"
      class="inline-message inline-message--error"
    >
      {{ preferenceSubmissionMessage }}
    </p>

    <BottomDrawer
      :open="preferenceDrawerOpen"
      :title="t('anchorEvent.formMode.preferenceDrawerTitle')"
      @close="closePreferenceDrawer"
    >
      <div class="preference-drawer">
        <section
          v-for="group in drawerTagGroups.categorized"
          :key="group.category"
          class="preference-group"
        >
          <h3 class="preference-group__title">{{ group.category }}</h3>
          <div class="preference-group__list">
            <button
              v-for="tag in group.tags"
              :key="tag.label"
              class="tag-pill"
              :class="{
                'tag-pill--selected':
                  drawerSelectedCategoryMap[group.category] === tag.label,
              }"
              type="button"
              @click="handleSelectDrawerCategoryTag(group.category, tag.label)"
            >
              <span class="tag-pill__label">{{ tag.label }}</span>
              <span v-if="tag.description" class="tag-pill__description">
                {{ tag.description }}
              </span>
            </button>
          </div>
        </section>

        <section
          v-if="drawerTagGroups.uncategorized.length > 0"
          class="preference-group"
        >
          <h3 class="preference-group__title">
            {{ drawerTagGroups.uncategorizedLabel }}
          </h3>
          <div class="preference-group__list">
            <button
              v-for="tag in drawerTagGroups.uncategorized"
              :key="tag.label"
              class="tag-pill"
              :class="{
                'tag-pill--selected':
                  drawerSelectedUncategorizedLabels.includes(tag.label),
              }"
              type="button"
              @click="handleToggleDrawerUncategorizedTag(tag.label)"
            >
              <span class="tag-pill__label">{{ tag.label }}</span>
              <span v-if="tag.description" class="tag-pill__description">
                {{ tag.description }}
              </span>
            </button>
          </div>
        </section>

        <section class="preference-group">
          <h3 class="preference-group__title">
            {{ t("anchorEvent.formMode.customTagTitle") }}
          </h3>
          <div class="custom-tag-row">
            <input
              v-model.trim="drawerCustomTagInput"
              class="custom-tag-row__input"
              :placeholder="t('anchorEvent.formMode.customTagPlaceholder')"
              type="text"
              maxlength="80"
              @keydown.enter.prevent="handleAddCustomTag"
            />
            <Button
              appearance="pill"
              tone="outline"
              size="sm"
              type="button"
              @click="handleAddCustomTag"
            >
              {{ t("anchorEvent.formMode.addCustomTagAction") }}
            </Button>
          </div>
          <p
            v-if="drawerCustomTagMessage"
            class="inline-message inline-message--error"
          >
            {{ drawerCustomTagMessage }}
          </p>
        </section>
      </div>

      <template #footer>
        <div class="drawer-actions">
          <Button
            appearance="pill"
            tone="outline"
            type="button"
            @click="closePreferenceDrawer"
          >
            {{ t("common.cancel") }}
          </Button>
          <Button
            appearance="pill"
            type="button"
            @click="handleSavePreferenceDrawer"
          >
            {{ t("common.confirm") }}
          </Button>
        </div>
      </template>
    </BottomDrawer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import {
  buildPreferenceTagGroups,
  derivePreferenceCategory,
} from "@/domains/event/model/form-mode";
import { useAnchorEventPreferenceTagSubmissions } from "@/domains/event/queries/useAnchorEventPreferenceTagSubmissions";
import Button from "@/shared/ui/actions/Button.vue";
import Cell from "@/shared/ui/display/Cell.vue";
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";

type FormModePresetTag = AnchorEventFormModeResponse["presetTags"][number];

const props = defineProps<{
  eventId: number;
  modelValue: readonly string[];
  presetTags: readonly FormModePresetTag[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const { t } = useI18n();
const preferenceTagSubmissionMutation =
  useAnchorEventPreferenceTagSubmissions();

const localCustomTags = ref<FormModePresetTag[]>([]);
const preferenceDrawerOpen = ref(false);
const drawerSelectedCategoryMap = ref<Record<string, string | null>>({});
const drawerSelectedUncategorizedLabels = ref<string[]>([]);
const drawerCustomTags = ref<FormModePresetTag[]>([]);
const drawerCustomTagInput = ref("");
const drawerCustomTagMessage = ref<string | null>(null);
const preferenceSubmissionMessage = ref<string | null>(null);

const effectivePresetTags = computed<FormModePresetTag[]>(() => {
  const byLabel = new Map<string, FormModePresetTag>();
  for (const tag of props.presetTags) {
    byLabel.set(tag.label.trim().toLocaleLowerCase("zh-CN"), tag);
  }
  for (const tag of localCustomTags.value) {
    const key = tag.label.trim().toLocaleLowerCase("zh-CN");
    if (!byLabel.has(key)) {
      byLabel.set(key, tag);
    }
  }
  return Array.from(byLabel.values());
});

const drawerTagGroups = computed(() =>
  buildPreferenceTagGroups(effectivePresetTags.value),
);

const preferenceCellValue = computed(() => {
  if (props.modelValue.length === 0) {
    return "";
  }

  return props.modelValue.join("、");
});

const openPreferenceDrawer = () => {
  drawerCustomTagMessage.value = null;
  const nextCategoryMap: Record<string, string | null> = {};
  const nextUncategorized: string[] = [];

  for (const preference of props.modelValue) {
    const category = derivePreferenceCategory(preference);
    if (category) {
      nextCategoryMap[category] = preference;
      continue;
    }
    nextUncategorized.push(preference);
  }

  drawerSelectedCategoryMap.value = nextCategoryMap;
  drawerSelectedUncategorizedLabels.value = [...nextUncategorized];
  drawerCustomTags.value = [...localCustomTags.value];
  drawerCustomTagInput.value = "";
  preferenceDrawerOpen.value = true;
};

const closePreferenceDrawer = () => {
  preferenceDrawerOpen.value = false;
  drawerCustomTagInput.value = "";
  drawerCustomTagMessage.value = null;
};

const handleSelectDrawerCategoryTag = (category: string, label: string) => {
  drawerSelectedCategoryMap.value = {
    ...drawerSelectedCategoryMap.value,
    [category]:
      drawerSelectedCategoryMap.value[category] === label ? null : label,
  };
};

const handleToggleDrawerUncategorizedTag = (label: string) => {
  if (drawerSelectedUncategorizedLabels.value.includes(label)) {
    drawerSelectedUncategorizedLabels.value =
      drawerSelectedUncategorizedLabels.value.filter((item) => item !== label);
    return;
  }
  drawerSelectedUncategorizedLabels.value = [
    ...drawerSelectedUncategorizedLabels.value,
    label,
  ];
};

const handleAddCustomTag = () => {
  drawerCustomTagMessage.value = null;
  const normalized = drawerCustomTagInput.value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return;
  }

  const knownLabels = new Set(
    [...effectivePresetTags.value, ...drawerCustomTags.value].map((tag) =>
      tag.label.trim().toLocaleLowerCase("zh-CN"),
    ),
  );
  const key = normalized.toLocaleLowerCase("zh-CN");
  if (knownLabels.has(key)) {
    const category = derivePreferenceCategory(normalized);
    if (category) {
      drawerSelectedCategoryMap.value = {
        ...drawerSelectedCategoryMap.value,
        [category]: normalized,
      };
    } else if (!drawerSelectedUncategorizedLabels.value.includes(normalized)) {
      drawerSelectedUncategorizedLabels.value = [
        ...drawerSelectedUncategorizedLabels.value,
        normalized,
      ];
    }
    drawerCustomTagInput.value = "";
    return;
  }

  const tag = {
    id: -Date.now(),
    label: normalized,
    description: "",
  };
  drawerCustomTags.value = [...drawerCustomTags.value, tag];
  const category = derivePreferenceCategory(normalized);
  if (category) {
    drawerSelectedCategoryMap.value = {
      ...drawerSelectedCategoryMap.value,
      [category]: normalized,
    };
  } else {
    drawerSelectedUncategorizedLabels.value = [
      ...drawerSelectedUncategorizedLabels.value,
      normalized,
    ];
  }
  drawerCustomTagInput.value = "";
};

const handleSavePreferenceDrawer = async () => {
  const nextSelectedPreferences = [
    ...Object.values(drawerSelectedCategoryMap.value).filter(
      (value): value is string => Boolean(value),
    ),
    ...drawerSelectedUncategorizedLabels.value,
  ];

  const existingLocalKeys = new Set(
    localCustomTags.value.map((tag) =>
      tag.label.trim().toLocaleLowerCase("zh-CN"),
    ),
  );
  const newCustomLabels = drawerCustomTags.value
    .filter(
      (tag) =>
        !existingLocalKeys.has(tag.label.trim().toLocaleLowerCase("zh-CN")),
    )
    .map((tag) => tag.label);

  localCustomTags.value = [...drawerCustomTags.value];
  emit("update:modelValue", Array.from(new Set(nextSelectedPreferences)));
  preferenceDrawerOpen.value = false;

  if (newCustomLabels.length === 0) {
    return;
  }

  try {
    await preferenceTagSubmissionMutation.mutateAsync({
      eventId: props.eventId,
      labels: newCustomLabels,
    });
    preferenceSubmissionMessage.value = null;
  } catch {
    preferenceSubmissionMessage.value = t(
      "anchorEvent.formMode.customTagSubmitFailed",
    );
  }
};
</script>

<style lang="scss" scoped>
.form-mode-preference-control,
.preference-drawer,
.preference-group {
  display: flex;
  flex-direction: column;
}

.form-mode-preference-control {
  gap: var(--sys-spacing-xs);
}

.preference-cell {
  border-top: 1px solid var(--sys-color-outline-variant);
}

.preference-drawer {
  gap: var(--sys-spacing-med);
}

.preference-group {
  gap: var(--sys-spacing-sm);
}

.preference-group__title {
  margin: 0;
  @include mx.pu-font(title-small);
}

.preference-group__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
}

.tag-pill {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.tag-pill--selected {
  border-color: var(--sys-color-primary);
  background: color-mix(
    in srgb,
    var(--sys-color-primary-container) 72%,
    var(--sys-color-surface)
  );
  transform: translateY(-2px);
}

.tag-pill__label {
  @include mx.pu-font(label-large);
}

.tag-pill__description {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body-small);
}

.custom-tag-row {
  display: flex;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.custom-tag-row__input {
  flex: 1 1 14rem;
  min-height: 2.75rem;
  padding: 0 var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  @include mx.pu-font(body-medium);
}

.drawer-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.drawer-actions > :deep(button) {
  flex: 1 1 14rem;
}

.inline-message {
  margin: 0;
  @include mx.pu-font(body-small);
}

.inline-message--error {
  color: var(--sys-color-error);
}
</style>
