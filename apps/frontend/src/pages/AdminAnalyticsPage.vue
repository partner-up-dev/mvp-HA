<template>
  <DesktopPageScaffold class="admin-analytics-page">
    <template #aside>
      <AdminNavigationCard show-logout @logout="logout" />
    </template>

    <template #header>
      <header class="admin-analytics-page__header">
        <h1 class="admin-analytics-page__title">BI 看板</h1>
        <p class="admin-analytics-page__subtitle">
          Anchor Event 到 PR 的分 Mode 转化漏斗会在这里呈现。
        </p>
      </header>
    </template>

    <section class="admin-analytics-page__panel">
      <h2>Anchor Event -> PR 转化漏斗</h2>
      <p>暂无可展示数据。</p>
    </section>
  </DesktopPageScaffold>
</template>

<script setup lang="ts">
import AdminNavigationCard from "@/domains/admin/ui/composites/AdminNavigationCard.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import DesktopPageScaffold from "@/shared/ui/layout/DesktopPageScaffold.vue";

const { logout } = useAdminAccess();
</script>

<style lang="scss" scoped>
.admin-analytics-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.admin-analytics-page__title,
.admin-analytics-page__subtitle,
.admin-analytics-page__panel h2,
.admin-analytics-page__panel p {
  margin: 0;
}

.admin-analytics-page__title {
  font-size: var(--dcs-typography-page-hero-size);
  font-weight: 700;
  line-height: 1.05;
}

.admin-analytics-page__subtitle,
.admin-analytics-page__panel p {
  color: var(--sys-color-on-surface-variant);
}

.admin-analytics-page__panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-large);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
}

.admin-analytics-page__panel h2 {
  @include mx.pu-font(title-large);
}
</style>
