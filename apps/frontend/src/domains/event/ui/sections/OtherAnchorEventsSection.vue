<template>
  <ExpandableCard
    v-if="shouldRenderSection && variant === 'panel'"
    class="other-anchor-events other-anchor-events--panel"
    :title="t('anchorEvent.otherEvents.title')"
    :default-expanded="false"
  >
    <p v-if="isLoading" class="other-anchor-events__state">
      {{ t("common.loading") }}
    </p>

    <AnchorEventHorizontalList
      v-else
      :events="otherEvents"
      variant="contained"
      card-surface="outline"
    />
  </ExpandableCard>

  <section
    v-else-if="shouldRenderSection"
    class="other-anchor-events other-anchor-events--embedded"
  >
    <h3 class="other-anchor-events__title">
      {{ t("anchorEvent.otherEvents.title") }}
    </h3>

    <p v-if="isLoading" class="other-anchor-events__state">
      {{ t("common.loading") }}
    </p>

    <AnchorEventHorizontalList
      v-else
      :events="otherEvents"
      variant="contained"
      card-surface="outline"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";
import AnchorEventHorizontalList from "@/domains/event/ui/composites/AnchorEventHorizontalList.vue";
import ExpandableCard from "@/shared/ui/containers/ExpandableCard.vue";

const props = withDefaults(
  defineProps<{
    currentEventId?: number | null;
    variant?: "embedded" | "panel";
  }>(),
  {
    currentEventId: null,
    variant: "embedded",
  },
);

const { t } = useI18n();
const { data: events, isLoading, isError } = useAnchorEvents();

const otherEvents = computed(() => {
  const eventList = events.value ?? [];

  if (props.currentEventId === null) {
    return eventList;
  }

  return eventList.filter((event) => event.id !== props.currentEventId);
});

const shouldRenderSection = computed(() => {
  if (isError.value) {
    return false;
  }

  return isLoading.value || otherEvents.value.length > 0;
});
</script>

<style lang="scss" scoped>
.other-anchor-events {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.other-anchor-events--embedded {
  padding-top: var(--sys-spacing-med);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.other-anchor-events__title {
  margin: 0;
  @include mx.pu-font(title-small);
  color: var(--sys-color-on-surface);
}

.other-anchor-events__state {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}
</style>
