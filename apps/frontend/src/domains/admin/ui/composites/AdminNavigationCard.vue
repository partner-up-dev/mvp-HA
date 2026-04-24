<template>
  <section class="admin-navigation-card">
    <div class="admin-navigation-card__header">
      <p class="admin-navigation-card__eyebrow">{{ t("adminCommon.title") }}</p>
      <p class="admin-navigation-card__subtitle">
        {{ t("adminCommon.subtitle") }}
      </p>
    </div>

    <nav class="admin-navigation-card__nav">
      <ChoiceCard
        :to="{ name: 'admin-pr' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navPR") }}
      </ChoiceCard>
      <ChoiceCard
        :to="{ name: 'admin-pr-messages' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navPRMessages") }}
      </ChoiceCard>
      <ChoiceCard
        :to="{ name: 'admin-booking-support' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navBookingSupport") }}
      </ChoiceCard>
      <ChoiceCard
        :to="{ name: 'admin-booking-execution' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navBookingExecution") }}
      </ChoiceCard>
      <ChoiceCard
        :to="{ name: 'admin-pois' }"
        class="admin-navigation-card__link"
      >
        {{ t("adminCommon.navPois") }}
      </ChoiceCard>
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
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";

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
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-lg);
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
}

</style>
