<template>
  <PageScaffold class="event-plaza-page">
    <PageHeader
      :title="t('eventPlaza.title')"
      :subtitle="t('eventPlaza.subtitle')"
      @back="goHome"
    />

    <div v-if="isLoading" class="loading-state">
      {{ t("common.loading") }}
    </div>

    <div v-else-if="isError" class="error-state">
      {{ t("eventPlaza.loadFailed") }}
    </div>

    <div v-else-if="events && events.length > 0" class="event-grid">
      <EventCard v-for="event in events" :key="event.id" :event="event" />
    </div>

    <div v-else class="empty-state">
      {{ t("eventPlaza.noEvents") }}
    </div>
  </PageScaffold>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import EventCard from "@/domains/event/ui/primitives/EventCard.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";

const { t } = useI18n();
const router = useRouter();
const { data: events, isLoading, isError } = useAnchorEvents();

const goHome = () => router.push("/");
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--sys-color-on-surface-variant);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.event-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
