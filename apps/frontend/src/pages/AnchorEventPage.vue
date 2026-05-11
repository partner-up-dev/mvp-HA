<template>
  <FooterRevealPageScaffold
    :class="[
      'anchor-event-page',
      { 'anchor-event-page--card-active': isCardStageActive },
    ]"
    data-page="event-detail"
  >
    <template #header>
      <PageHeader
        v-if="headerContext"
        class="anchor-event-page__header"
        :title="headerContext.title"
        :subtitle="headerContext.subtitle ?? undefined"
        :back-fallback-to="{ name: 'event-plaza' }"
        data-region="event-header"
      >
        <template #top-actions>
          <div
            class="view-mode-switch"
            role="group"
            :aria-label="t('anchorEvent.viewMode.ariaLabel')"
            data-region="view-mode"
          >
            <button
              type="button"
              class="view-mode-switch__button"
              :class="{
                'view-mode-switch__button--active': viewMode === 'CARD',
              }"
              @click="handleSwitchViewMode('CARD')"
            >
              {{ t("anchorEvent.viewMode.card") }}
            </button>
            <button
              type="button"
              class="view-mode-switch__button"
              :class="{
                'view-mode-switch__button--active': viewMode === 'LIST',
              }"
              @click="handleSwitchViewMode('LIST')"
            >
              {{ t("anchorEvent.viewMode.list") }}
            </button>
          </div>
        </template>
      </PageHeader>
    </template>

    <KeepAlive v-if="eventId !== null">
      <AnchorEventCardModeSurface
        v-if="viewMode === 'CARD'"
        :key="`card:${eventId}`"
        :event-id="eventId"
        @header-context="handleHeaderContext"
        @card-stage-active-change="isCardStageActive = $event"
      />
      <AnchorEventListModeSurface
        v-else
        :key="`list:${eventId}`"
        :event-id="eventId"
        @header-context="handleHeaderContext"
      />
    </KeepAlive>
    <div v-else class="error-state">
      {{ t("anchorEvent.loadFailed") }}
      <router-link :to="{ name: 'event-plaza' }" class="back-link">
        {{ t("anchorEvent.backToPlaza") }}
      </router-link>
    </div>

    <template #footer>
      <FullCommonFooter data-region="footer" />
    </template>
  </FooterRevealPageScaffold>

  <OfficialAccountFollowNudge
    :open="officialAccountFollowPrompt.isVisible.value"
    @dismiss="officialAccountFollowPrompt.dismissPrompt"
    @complete="officialAccountFollowPrompt.markPromptCompleted"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import FullCommonFooter from "@/domains/landing/ui/sections/FullCommonFooter.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import AnchorEventCardModeSurface from "@/domains/event/ui/surfaces/AnchorEventCardModeSurface/AnchorEventCardModeSurface.vue";
import AnchorEventListModeSurface from "@/domains/event/ui/surfaces/AnchorEventListModeSurface.vue";
import OfficialAccountFollowNudge from "@/domains/marketing/ui/OfficialAccountFollowNudge.vue";
import FooterRevealPageScaffold from "@/shared/ui/layout/FooterRevealPageScaffold.vue";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";

type EventViewMode = "LIST" | "CARD";

type HeaderContext = {
  title: string;
  subtitle: string | null;
};

const route = useRoute();
const { t } = useI18n();

const OFFICIAL_ACCOUNT_FOLLOW_PROMPT_DELAY_MS = 3000;

const normalizeQueryViewMode = (value: string): EventViewMode | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "card") {
    return "CARD";
  }
  if (normalized === "list") {
    return "LIST";
  }
  return null;
};

const resolveQueryViewMode = (value: unknown): EventViewMode | null => {
  if (typeof value === "string") {
    return normalizeQueryViewMode(value);
  }
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = normalizeQueryViewMode(item);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const resolveInitialViewMode = (): EventViewMode =>
  resolveQueryViewMode(route.query.mode) ?? "LIST";

const viewMode = ref<EventViewMode>("LIST");
const headerContext = ref<HeaderContext | null>(null);
const isCardStageActive = ref(false);
const officialAccountFollowPrompt =
  useOfficialAccountFollowPrompt("anchor_event");

const eventId = computed(() => {
  const raw = route.params.eventId;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
});

const handleHeaderContext = (context: HeaderContext | null) => {
  headerContext.value = context;
};

const applyViewMode = (mode: EventViewMode) => {
  if (mode !== "CARD") {
    isCardStageActive.value = false;
  }

  viewMode.value = mode;
};

const handleSwitchViewMode = (mode: EventViewMode) => {
  if (viewMode.value === mode) {
    return;
  }

  applyViewMode(mode);
};

watch(
  [eventId, () => route.query.mode],
  ([nextEventId], previousValues) => {
    const previousEventId = previousValues?.[0] ?? null;
    if (nextEventId !== previousEventId) {
      headerContext.value = null;
    }
    applyViewMode(resolveInitialViewMode());
  },
  { immediate: true },
);

onMounted(() => {
  officialAccountFollowPrompt.requestPromptAfterDelay(
    OFFICIAL_ACCOUNT_FOLLOW_PROMPT_DELAY_MS,
  );
});
</script>

<style lang="scss" scoped>
:global(html.anchor-event-card-overflow-guard),
:global(body.anchor-event-card-overflow-guard) {
  overflow-x: clip;
}

.anchor-event-page {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.anchor-event-page__header {
  flex-shrink: 0;
}

.view-mode-switch {
  display: inline-flex;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: 999px;
  overflow: hidden;
}

.view-mode-switch__button {
  @include mx.pu-font(label-medium);
  border: none;
  min-height: 44px;
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  background: transparent;
  color: var(--sys-color-on-surface-variant);
  cursor: pointer;
}

.view-mode-switch__button--active {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.error-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--sys-color-on-surface-variant);
}

.back-link {
  display: block;
  margin-top: var(--sys-spacing-small);
  color: var(--sys-color-primary);
  text-decoration: none;
}
</style>
