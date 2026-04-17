<template>
  <section class="admin-navigation-card">
    <div class="admin-navigation-card__header">
      <p class="admin-navigation-card__eyebrow">{{ t("adminCommon.title") }}</p>
      <p class="admin-navigation-card__subtitle">
        {{ t("adminCommon.subtitle") }}
      </p>
    </div>

    <nav class="admin-navigation-card__nav">
      <RouterLink
        :to="{ name: 'admin-anchor-pr' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navAnchorPR") }}
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin-anchor-pr-messages' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navAnchorPRMessages") }}
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin-booking-support' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navBookingSupport") }}
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin-booking-execution' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navBookingExecution") }}
      </RouterLink>
      <RouterLink
        :to="{ name: 'admin-pois' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navPois") }}
      </RouterLink>
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
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";

defineProps<{
  showLogout?: boolean;
}>();

defineEmits<{
  logout: [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.admin-navigation-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  padding: var(--sys-spacing-med);
  @include mx.pu-surface-panel(admin-workspace);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent),
    var(--sys-color-surface-container);
}

.admin-navigation-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.admin-navigation-card__eyebrow {
  @include mx.pu-font(label-medium);
  margin: 0;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sys-color-primary);
}

.admin-navigation-card__subtitle {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.admin-navigation-card__nav {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.admin-navigation-card__link {
  @include mx.pu-font(body-medium);
  @include mx.pu-selection-card(default);
}

.admin-navigation-card__link.router-link-active {
  @include mx.pu-selection-card(active);
}

</style>
