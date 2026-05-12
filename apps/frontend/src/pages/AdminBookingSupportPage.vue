<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #header>
      <header class="header">
        <h1 class="title">{{ t("adminBookingSupport.title") }}</h1>
        <p class="subtitle">{{ t("adminBookingSupport.subtitle") }}</p>
      </header>
    </template>

    <template #rail>
      <SupportResourceEventRail
        v-model="selectedEventIdRaw"
        :anchor-events="anchorEvents"
      />
    </template>

    <template #main>
      <LoadingIndicator
        v-if="workspaceQuery.isLoading.value"
        :message="t('common.loading')"
      />
      <ErrorToast
        v-else-if="workspaceQuery.error.value"
        :message="workspaceQuery.error.value.message"
        persistent
      />
      <SupportResourceConfigSection
        v-else
        :selected-event-id="selectedEventId"
        :available-location-options="availableLocationOptions"
        :is-admin="isAdmin"
      />
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  type AdminAnchorEventWorkspaceResponse,
  useAdminAnchorEventWorkspace,
} from "@/domains/admin/queries/useAdminAnchorEvents";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import SupportResourceEventRail from "@/domains/admin/ui/support-resource/components/SupportResourceEventRail.vue";
import SupportResourceConfigSection from "@/domains/admin/ui/support-resource/sections/SupportResourceConfigSection.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";

type AdminWorkspace = NonNullable<AdminAnchorEventWorkspaceResponse>;
type AdminAnchorEventRecord = AdminWorkspace["events"][number];

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminAnchorEventWorkspace(isAdmin);
const selectedEventIdRaw = ref("");

const selectedEventId = computed<number | null>(() => {
  const parsed = Number(selectedEventIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const anchorEvents = computed<AdminAnchorEventRecord[]>(
  () => workspaceQuery.data.value?.events ?? [],
);

const selectedEvent = computed<AdminAnchorEventRecord | null>(
  () =>
    anchorEvents.value.find((event) => event.id === selectedEventId.value) ??
    null,
);

const availableLocationOptions = computed<string[]>(() => {
  const event = selectedEvent.value;
  if (!event) return [];

  const allLocationIds = event.locationPool
    .map((locationId) => locationId.trim())
    .filter((locationId) => locationId.length > 0);

  return Array.from(new Set(allLocationIds));
});

watch(
  [anchorEvents, isAdmin],
  ([events, adminReady]) => {
    if (!adminReady || events.length === 0) {
      selectedEventIdRaw.value = "";
      return;
    }
    if (!events.some((event) => String(event.id) === selectedEventIdRaw.value)) {
      selectedEventIdRaw.value = String(events[0].id);
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.title,
.subtitle {
  margin: 0;
}

.title {
  @include mx.pu-font(headline-small);
}

.subtitle {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}
</style>
