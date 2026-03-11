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
        :to="{ name: 'admin-booking-support' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navBookingSupport") }}
      </RouterLink>
    </nav>

    <button
      v-if="showLogout"
      class="admin-navigation-card__logout"
      type="button"
      @click="$emit('logout')"
    >
      {{ t("adminCommon.logoutAction") }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

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
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent),
    var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
}

.admin-navigation-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.admin-navigation-card__eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sys-color-primary);
}

.admin-navigation-card__subtitle {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  font-size: 0.875rem;
}

.admin-navigation-card__nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.admin-navigation-card__link {
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  color: var(--sys-color-on-surface);
  text-decoration: none;
  background: var(--sys-color-surface);
  border: 1px solid var(--sys-color-outline-variant);
}

.admin-navigation-card__link.router-link-active {
  background: color-mix(in srgb, var(--sys-color-primary) 14%, var(--sys-color-surface));
  border-color: color-mix(in srgb, var(--sys-color-primary) 45%, var(--sys-color-outline-variant));
}

.admin-navigation-card__logout {
  border: 1px solid var(--sys-color-outline);
  border-radius: 999px;
  padding: 0.65rem 0.95rem;
  background: transparent;
  color: var(--sys-color-on-surface);
  cursor: pointer;
}
</style>
