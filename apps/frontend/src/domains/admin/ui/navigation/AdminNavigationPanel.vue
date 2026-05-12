<template>
  <section class="admin-navigation-panel">
    <div class="admin-navigation-panel__header">
      <p class="admin-navigation-panel__eyebrow">{{ t("adminCommon.title") }}</p>
      <p class="admin-navigation-panel__subtitle">
        {{ t("adminCommon.subtitle") }}
      </p>
    </div>

    <nav class="admin-navigation-panel__nav" :aria-label="t('adminCommon.title')">
      <section
        v-for="group in visibleNavigationGroups"
        :key="group.id"
        class="admin-navigation-panel__group"
        :class="{ 'is-active': activeGroupId === group.id }"
      >
        <button
          class="admin-navigation-panel__group-trigger"
          type="button"
          :aria-expanded="isGroupExpanded(group.id)"
          :aria-controls="`admin-navigation-panel-group-${group.id}`"
          @click="toggleGroup(group.id)"
        >
          <span>{{ t(group.labelKey) }}</span>
          <span class="admin-navigation-panel__chevron" aria-hidden="true"></span>
        </button>

        <div
          v-if="isGroupExpanded(group.id)"
          :id="`admin-navigation-panel-group-${group.id}`"
          class="admin-navigation-panel__items"
        >
          <ChoiceCard
            v-for="item in group.items"
            :key="item.id"
            :to="buildItemTarget(item)"
            :active="isItemActive(item)"
            tone="low"
            class="admin-navigation-panel__item"
          >
            <span class="admin-navigation-panel__item-label">
              {{ t(item.labelKey) }}
            </span>
          </ChoiceCard>
        </div>
      </section>
    </nav>

    <Button
      v-if="showLogout"
      appearance="pill"
      tone="outline"
      size="sm"
      type="button"
      @click="$emit('logout')"
    >
      {{ t("adminCommon.logoutAction") }}
    </Button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute, type RouteLocationRaw } from "vue-router";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import {
  adminNavigationGroups,
  type AdminNavigationItem,
} from "@/domains/admin/ui/navigation/adminNavigationModel";
import {
  useAdminSessionStore,
} from "@/domains/admin/use-cases/useAdminSessionStore";
import type { AdminSessionRole } from "@/domains/admin/model/admin-session-storage";

defineProps<{
  showLogout?: boolean;
}>();

defineEmits<{
  logout: [];
}>();

const { t } = useI18n();
const route = useRoute();
const adminSessionStore = useAdminSessionStore();
const { roles } = storeToRefs(adminSessionStore);
const expandedGroupIds = ref<Set<string>>(new Set());
const hasRequiredRole = (
  requiredRoles: readonly AdminSessionRole[] | undefined,
): boolean =>
  !requiredRoles?.length ||
  roles.value.some((role) => requiredRoles.includes(role));

const visibleNavigationGroups = computed(() =>
  adminNavigationGroups
    .filter((group) => hasRequiredRole(group.requiredRoles))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasRequiredRole(item.requiredRoles ?? group.requiredRoles),
      ),
    }))
    .filter((group) => group.items.length > 0),
);

const activeGroupId = computed(() => {
  const currentRouteName = typeof route.name === "string" ? route.name : "";
  return (
    visibleNavigationGroups.value.find((group) =>
      group.items.some((item) => item.routeName === currentRouteName),
    )?.id ?? null
  );
});

const defaultSectionByRouteName = computed(() => {
  const defaults = new Map<string, string>();
  for (const group of visibleNavigationGroups.value) {
    for (const item of group.items) {
      if (!item.hash || defaults.has(item.routeName)) continue;
      defaults.set(item.routeName, item.hash);
    }
  }
  return defaults;
});

const buildItemTarget = (item: AdminNavigationItem): RouteLocationRaw => ({
  name: item.routeName,
  hash: item.hash,
});

const isGroupExpanded = (groupId: string): boolean =>
  expandedGroupIds.value.has(groupId);

const toggleGroup = (groupId: string): void => {
  expandedGroupIds.value = expandedGroupIds.value.has(groupId)
    ? new Set()
    : new Set([groupId]);
};

const isItemActive = (item: AdminNavigationItem): boolean => {
  if (route.name !== item.routeName) return false;
  if (!item.hash) return route.hash.length === 0;
  return (
    route.hash === item.hash ||
    (route.hash.length === 0 &&
      defaultSectionByRouteName.value.get(item.routeName) === item.hash)
  );
};

watch(
  activeGroupId,
  (nextGroupId) => {
    if (!nextGroupId) return;
    expandedGroupIds.value = new Set([nextGroupId]);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.admin-navigation-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  max-height: calc(100dvh - var(--pu-safe-top) - var(--sys-spacing-large));
  overflow-y: auto;
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}

.admin-navigation-panel__header,
.admin-navigation-panel__nav,
.admin-navigation-panel__group,
.admin-navigation-panel__items {
  display: flex;
  flex-direction: column;
}

.admin-navigation-panel__header {
  gap: var(--sys-spacing-xsmall);
}

.admin-navigation-panel__nav {
  gap: var(--sys-spacing-medium);
}

.admin-navigation-panel__group {
  gap: var(--sys-spacing-small);
}

.admin-navigation-panel__items {
  gap: var(--sys-spacing-xsmall);
}

.admin-navigation-panel__eyebrow,
.admin-navigation-panel__subtitle,
.admin-navigation-panel__group-title {
  margin: 0;
}

.admin-navigation-panel__eyebrow {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-primary);
}

.admin-navigation-panel__subtitle {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.admin-navigation-panel__group-trigger {
  @include mx.pu-font(label-medium);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-xsmall) 0;
  border: 0;
  background: transparent;
  color: var(--sys-color-on-surface-variant);
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.admin-navigation-panel__group.is-active .admin-navigation-panel__group-trigger {
  color: var(--sys-color-primary);
}

.admin-navigation-panel__chevron {
  width: var(--sys-spacing-small);
  height: var(--sys-spacing-small);
  flex-shrink: 0;
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  transform: rotate(45deg);
  transition: transform 180ms ease;
}

.admin-navigation-panel__group
  .admin-navigation-panel__group-trigger[aria-expanded="true"]
  .admin-navigation-panel__chevron {
  transform: rotate(225deg);
}

.admin-navigation-panel__item {
  @include mx.pu-font(body-medium);
}

.admin-navigation-panel__item.router-link-active:not(.is-active),
.admin-navigation-panel__item.router-link-exact-active:not(.is-active) {
  border-color: var(--sys-color-outline-variant);
}

.admin-navigation-panel__item.is-active,
.admin-navigation-panel__item.router-link-active.is-active,
.admin-navigation-panel__item.router-link-exact-active.is-active {
  border-color: var(--sys-color-primary);
}

.admin-navigation-panel__item-label {
  min-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .admin-navigation-panel__chevron {
    transition: none !important;
  }
}
</style>
