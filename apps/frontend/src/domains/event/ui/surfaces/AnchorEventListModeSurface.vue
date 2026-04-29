<template>
  <div class="date-section">
    <TabBar
      v-if="dateTabs.length > 0"
      :items="dateTabs"
      :model-value="selectedDateKey ?? 'none'"
      :aria-label="t('anchorEvent.dateLabel')"
      @update:model-value="handleDateTabChange"
    />

    <div class="date-content" role="tabpanel">
      <div class="batch-list" data-region="pr-list">
        <div v-if="visiblePRItems.length > 0" class="pr-list">
          <AnchorEventPRCard
            v-for="item in visiblePRItems"
            :key="`${item.timeWindowKey}:${item.pr.id}`"
            :pr="item.pr"
            :time-label="item.timeLabel"
            :cover-image="resolveCoverImage(item.pr.location)"
          />
        </div>
        <div v-else class="empty-batch">
          {{
            hasBrowseTimeWindows
              ? t("anchorEvent.noPRsInSelectedDate")
              : t("anchorEvent.noBatches")
          }}
        </div>
      </div>

      <div class="batch-action-cards">
        <EventPRCreateCard
          :title="createCardTitle"
          :time-window-label="createCardSubtitleTimeLabel"
          :event-title="eventTitle"
          :time-window-options="createTimeWindowOptions"
          :selected-time-window-key="selectedTimeWindowKey"
          :location-options="createTimeWindowLocationOptions"
          :default-expanded="shouldAutoExpandCreateCard"
          :auto-expand-context-key="createCardAutoExpandContextKey"
          :pending="isCreatePending"
          :error-message="createActionErrorMessage"
          @update:selected-time-window-key="handleSelectedTimeWindowChange"
          @create="handleCreateInList"
          data-region="create-pr"
        />
        <AnchorEventBetaGroupCard
          :event-id="eventId"
          :event-title="eventTitle"
          :qr-code-url="eventBetaGroupQrCode"
          :default-expanded="false"
          variant="list"
        />
        <OtherAnchorEventsSection
          :current-event-id="eventId"
          variant="panel"
          data-region="discover-other-events"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import TabBar from "@/shared/ui/navigation/TabBar.vue";
import AnchorEventPRCard from "@/domains/event/ui/primitives/AnchorEventPRCard.vue";
import EventPRCreateCard from "@/domains/event/ui/primitives/EventPRCreateCard.vue";
import AnchorEventBetaGroupCard from "@/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue";
import OtherAnchorEventsSection from "@/domains/event/ui/sections/OtherAnchorEventsSection.vue";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";

type DateTabItem = {
  key: string;
  label: string;
  tabClass?: string;
};

type AnchorEventTimeWindow =
  AnchorEventDetailResponse["browseTimeWindows"][number];
type CreateTimeWindow = AnchorEventDetailResponse["createTimeWindows"][number];
type AnchorEventTimeWindowPR = AnchorEventTimeWindow["prs"][number];

type DateGroupTimeWindowItem = {
  entry: AnchorEventTimeWindow;
  timeLabel: string;
};

type DateGroup = {
  key: string;
  label: string;
  isExpiredDate: boolean;
  timeWindows: DateGroupTimeWindowItem[];
};

type VisiblePRItem = {
  timeWindowKey: string;
  pr: AnchorEventTimeWindowPR;
  timeLabel: string;
};

type CreateTimeWindowChoice = {
  entry: CreateTimeWindow;
  optionLabel: string;
  subtitleLabel: string;
};

const props = defineProps<{
  hasBrowseTimeWindows: boolean;
  dateTabs: DateTabItem[];
  selectedDateKey: string | null;
  selectedDateGroup: DateGroup | null;
  createTimeWindowChoices: CreateTimeWindowChoice[];
  eventId: number;
  eventTitle: string;
  eventBetaGroupQrCode: string | null;
  isCreatePending: boolean;
  createActionErrorMessage: string | null;
  resolveCoverImage: (location: string | null) => string | null;
}>();

const emit = defineEmits<{
  "select-date": [dateKey: string];
  "create-in-list": [
    payload: {
      timeWindow: [string | null, string | null] | null;
      locationId: string | null;
    },
  ];
}>();

const { t } = useI18n();
const selectedTimeWindowKey = ref<string | null>(null);

const isVisibleListModePR = (
  pr: AnchorEventTimeWindowPR,
  group: DateGroup,
): boolean =>
  group.isExpiredDate ? pr.status === "CLOSED" : pr.status !== "EXPIRED";

const visiblePRItems = computed<VisiblePRItem[]>(() => {
  const items: VisiblePRItem[] = [];
  const group = props.selectedDateGroup;
  if (!group) {
    return items;
  }

  for (const timeWindowItem of group.timeWindows) {
    for (const pr of timeWindowItem.entry.prs.filter((entry) =>
      isVisibleListModePR(entry, group),
    )) {
      items.push({
        timeWindowKey: timeWindowItem.entry.key,
        pr,
        timeLabel: timeWindowItem.timeLabel,
      });
    }
  }

  return items;
});

const isJoinablePR = (pr: AnchorEventTimeWindowPR): boolean =>
  pr.status === "OPEN" || pr.status === "READY";

const timeWindowHasJoinablePR = (entry: AnchorEventTimeWindow): boolean =>
  entry.prs.some(isJoinablePR);

const hasJoinablePRAtBrowseTimeWindowKey = (
  group: DateGroup | null,
  timeWindowKey: string,
): boolean => {
  const browseTimeWindow = group?.timeWindows.find(
    ({ entry }) => entry.key === timeWindowKey,
  )?.entry;
  if (!browseTimeWindow) {
    return false;
  }

  return timeWindowHasJoinablePR(browseTimeWindow);
};

const resolveDefaultCreateTimeWindowKey = (
  group: DateGroup | null,
  createTimeWindowChoices: CreateTimeWindowChoice[],
): string | null => {
  if (createTimeWindowChoices.length === 0) {
    return null;
  }

  const firstCreatableTimeWindowWithoutAvailablePR = createTimeWindowChoices.find(
    ({ entry }) =>
      entry.locationOptions.some((option) => !option.disabled) &&
      !hasJoinablePRAtBrowseTimeWindowKey(group, entry.key),
  );
  if (firstCreatableTimeWindowWithoutAvailablePR) {
    return firstCreatableTimeWindowWithoutAvailablePR.entry.key;
  }

  const firstCreatableTimeWindow = createTimeWindowChoices.find(({ entry }) =>
    entry.locationOptions.some((option) => !option.disabled),
  );
  if (firstCreatableTimeWindow) {
    return firstCreatableTimeWindow.entry.key;
  }

  return createTimeWindowChoices[0]?.entry.key ?? null;
};

watch(
  [() => props.selectedDateGroup, () => props.createTimeWindowChoices],
  ([group, createTimeWindowChoices]) => {
    const currentTimeWindowKey = selectedTimeWindowKey.value;
    if (
      currentTimeWindowKey !== null &&
      createTimeWindowChoices.some(({ entry }) => entry.key === currentTimeWindowKey)
    ) {
      return;
    }

    const preferredTimeWindowKey = resolveDefaultCreateTimeWindowKey(
      group,
      createTimeWindowChoices,
    );
    if (
      preferredTimeWindowKey !== null &&
      createTimeWindowChoices.some(({ entry }) => entry.key === preferredTimeWindowKey)
    ) {
      selectedTimeWindowKey.value = preferredTimeWindowKey;
      return;
    }

    selectedTimeWindowKey.value = createTimeWindowChoices[0]?.entry.key ?? null;
  },
  { immediate: true, deep: true },
);

const timeWindowLabelByKey = computed(() => {
  const map = new Map<string, string>();
  for (const timeWindowChoice of props.createTimeWindowChoices) {
    map.set(timeWindowChoice.entry.key, timeWindowChoice.subtitleLabel);
  }
  return map;
});

const createTimeWindowOptions = computed(() =>
  props.createTimeWindowChoices.map(({ entry, optionLabel }) => ({
    key: entry.key,
    label: optionLabel,
  })),
);

const selectedTimeWindowEntry = computed(() => {
  if (selectedTimeWindowKey.value === null) {
    return null;
  }

  return (
    props.createTimeWindowChoices.find(
      ({ entry }) => entry.key === selectedTimeWindowKey.value,
    )?.entry ?? null
  );
});

const createTimeWindowLabel = computed(() => {
  const targetTimeWindowKey = selectedTimeWindowEntry.value?.key ?? null;
  if (targetTimeWindowKey === null) {
    return "";
  }

  return timeWindowLabelByKey.value.get(targetTimeWindowKey) ?? "";
});

const createCardSubtitleTimeLabel = computed(() => {
  return createTimeWindowLabel.value;
});

const createTimeWindowLocationOptions = computed(
  () => selectedTimeWindowEntry.value?.locationOptions ?? [],
);

const hasJoinablePRInSelectedDate = computed(() => {
  const group = props.selectedDateGroup;
  if (!group) {
    return false;
  }

  return group.timeWindows.some(({ entry }) => timeWindowHasJoinablePR(entry));
});

const createCardTitle = computed(() => {
  if (hasJoinablePRInSelectedDate.value) {
    return t("anchorEvent.createCard.title");
  }

  return t("anchorEvent.createCard.titleWhenNoAvailablePR");
});

const shouldAutoExpandCreateCard = computed(() => {
  if (props.createTimeWindowChoices.length === 0) {
    return false;
  }

  return !hasJoinablePRInSelectedDate.value;
});

const createCardAutoExpandContextKey = computed(
  () =>
    `${props.selectedDateKey ?? "none"}:${selectedTimeWindowKey.value ?? "none"}`,
);

const handleSelectedTimeWindowChange = (key: string | null) => {
  selectedTimeWindowKey.value = key;
};

const handleDateTabChange = (value: string | number) => {
  emit("select-date", String(value));
};

const handleCreateInList = (locationId: string | null) => {
  emit("create-in-list", {
    timeWindow: selectedTimeWindowEntry.value?.timeWindow ?? null,
    locationId,
  });
};
</script>

<style lang="scss" scoped>
.date-section {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 1rem;
}

.date-section :deep(.tab-bar) {
  margin-bottom: 1rem;
}

.date-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.pr-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-small) + var(--sys-spacing-xsmall));
}

.batch-action-cards {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  margin-top: auto;
  padding-top: var(--sys-spacing-medium);
}

.empty-state,
.empty-batch {
  text-align: center;
  padding: calc(var(--sys-spacing-large) + var(--sys-spacing-medium)) 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
