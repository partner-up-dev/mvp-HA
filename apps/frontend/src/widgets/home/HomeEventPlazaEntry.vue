<template>
  <section class="plaza-entry" aria-labelledby="home-plaza-entry-title">
    <RouterLink
      class="plaza-link"
      :to="{ name: 'event-plaza' }"
      @click="handleClick"
    >
      <div class="plaza-content">
        <h2 id="home-plaza-entry-title">
          {{ t("home.landing.plazaEntryTitle") }}
        </h2>
        <p>{{ t("home.landing.plazaEntryDescription") }}</p>
      </div>
      <span class="plaza-action">
        {{ t("home.landing.plazaEntryAction") }}
      </span>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { trackEvent } from "@/shared/analytics/track";

const { t } = useI18n();

const handleClick = () => {
  trackEvent("home_event_plaza_entry_click", {
    source: "landing",
  });
};
</script>

<style lang="scss" scoped>
.plaza-entry {
  display: flex;
}

.plaza-link {
  width: 100%;
  text-decoration: none;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background:
    linear-gradient(
      150deg,
      color-mix(in srgb, var(--sys-color-tertiary) 20%, transparent),
      transparent 70%
    ),
    var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-med);
  display: flex;
  justify-content: space-between;
  gap: var(--sys-spacing-med);
  align-items: flex-end;
  transition: transform 180ms ease;

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.plaza-content {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;

  h2 {
    @include mx.pu-font(title-medium);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}

.plaza-action {
  @include mx.pu-font(label-large);
  color: var(--sys-color-primary);
  flex-shrink: 0;
}
</style>
