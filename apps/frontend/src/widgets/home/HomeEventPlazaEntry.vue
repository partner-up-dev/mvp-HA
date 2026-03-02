<template>
  <section class="plaza-entry" aria-labelledby="home-plaza-entry-title">
    <p class="plaza-kicker">{{ t("eventPlaza.title") }}</p>
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
      <span class="plaza-action">{{ t("home.landing.plazaEntryAction") }}</span>
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
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-lg) 0;
  border-top: 1px solid var(--sys-color-outline-variant);
  border-bottom: 1px solid var(--sys-color-outline-variant);
}

.plaza-kicker {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.plaza-link {
  width: 100%;
  text-decoration: none;
  display: flex;
  justify-content: space-between;
  gap: var(--sys-spacing-med);
  align-items: baseline;
  transition: opacity 180ms ease;

  &:active {
    opacity: 0.72;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.plaza-content {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  min-width: 0;

  h2 {
    @include mx.pu-font(headline-small);
    color: var(--sys-color-on-surface);
    margin: 0;
    text-wrap: balance;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}

.plaza-action {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;

  &::after {
    content: " \2192";
  }
}
</style>
