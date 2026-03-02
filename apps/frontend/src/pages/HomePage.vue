<template>
  <div class="home-page">
    <section class="home-section home-section--hero">
      <HomeHero />
      <HomeValueProps class="hero-values" />
    </section>

    <section class="home-section home-section--event">
      <HomeEventHighlights />
      <HomeEventPlazaEntry />
    </section>

    <section class="home-section home-section--actions">
      <header class="section-header">
        <h2>{{ t("home.landing.secondaryActionsTitle") }}</h2>
        <p>{{ t("home.landing.secondaryActionsHint") }}</p>
      </header>
      <section class="secondary-actions">
        <RouterLink class="secondary-entry" :to="{ name: 'pr-new' }">
          <div class="secondary-copy">
            <h3>{{ t("home.landing.secondaryCreateTitle") }}</h3>
            <p>{{ t("home.landing.secondaryCreateDescription") }}</p>
          </div>
          <span class="secondary-action-text">
            {{ t("home.landing.secondaryCreateAction") }}
          </span>
        </RouterLink>
      </section>
    </section>

    <footer class="home-section home-section--footer">
      <HomeContactEntry />

      <section class="footer-brand">
        <h2>{{ t("home.landing.footerIntroTitle") }}</h2>
        <p>{{ t("home.landing.footerIntroBody") }}</p>
      </section>

      <nav class="footer-nav" :aria-label="t('home.landing.footerNavTitle')">
        <RouterLink
          v-for="link in footerNavLinks"
          :key="link.routeName"
          class="footer-nav-link"
          :to="{ name: link.routeName }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
    </footer>

    <HomeBookmarkNudge />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import HomeHero from "@/widgets/home/HomeHero.vue";
import HomeValueProps from "@/widgets/home/HomeValueProps.vue";
import HomeEventHighlights from "@/widgets/home/HomeEventHighlights.vue";
import HomeEventPlazaEntry from "@/widgets/home/HomeEventPlazaEntry.vue";
import HomeBookmarkNudge from "@/widgets/home/HomeBookmarkNudge.vue";
import HomeContactEntry from "@/widgets/home/HomeContactEntry.vue";

const { t } = useI18n();

const footerNavLinks = computed(() => [
  {
    routeName: "home",
    label: t("home.landing.footerNavHome"),
  },
  {
    routeName: "event-plaza",
    label: t("eventPlaza.title"),
  },
  {
    routeName: "pr-new",
    label: t("createPage.title"),
  },
  {
    routeName: "contact-author",
    label: t("contactAuthorPage.title"),
  },
]);
</script>

<style lang="scss" scoped>
.home-page {
  --home-pad-top: calc(var(--sys-spacing-lg) + var(--pu-safe-top));
  --home-pad-bottom: calc(var(--sys-spacing-lg) + var(--pu-safe-bottom));
  --home-section-min-height: calc(
    var(--pu-vh) - var(--home-pad-top) - var(--home-pad-bottom)
  );
  position: relative;
  isolation: isolate;
  overflow-x: clip;
  max-width: 680px;
  margin: 0 auto;
  padding: var(--home-pad-top)
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    var(--home-pad-bottom)
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.home-page::before,
.home-page::after {
  content: "";
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
}

.home-page::before {
  width: 15rem;
  height: 15rem;
  top: 4rem;
  right: -7rem;
  background: color-mix(in srgb, var(--sys-color-tertiary) 16%, transparent);
  filter: blur(4px);
}

.home-page::after {
  width: 12rem;
  height: 12rem;
  top: 18rem;
  left: -8rem;
  background: color-mix(in srgb, var(--sys-color-primary) 13%, transparent);
}

.home-page > * {
  position: relative;
  z-index: 1;
}

.home-section {
  min-height: var(--home-section-min-height);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(1rem, 4.5vw, 2rem);
  padding-block: clamp(1rem, 4vw, 2rem);
}

.home-section + .home-section {
  border-top: 1px solid color-mix(in srgb, var(--sys-color-outline) 55%, transparent);
}

.home-section--hero {
  justify-content: space-between;
}

.hero-values {
  margin-top: auto;
}

.home-section--event {
  justify-content: center;
}

.home-section--actions {
  justify-content: center;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2 {
    @include mx.pu-font(headline-small);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
    max-width: 28ch;
  }
}

.secondary-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.secondary-entry {
  text-decoration: none;
  padding: var(--sys-spacing-xs) 0;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: var(--sys-spacing-sm);
}

.secondary-copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h3 {
    @include mx.pu-font(headline-small);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}

.secondary-action-text {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;

  &::after {
    content: " \2192";
  }
}

.home-section--footer {
  justify-content: space-between;
  gap: clamp(1.5rem, 5vw, 2.5rem);
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2 {
    @include mx.pu-font(title-large);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    max-width: 34ch;
    margin: 0;
  }
}

.footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
}

.footer-nav-link {
  @include mx.pu-font(label-large);
  text-decoration: none;
  color: var(--sys-color-on-surface-variant);

  &::after {
    content: " \2197";
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}
</style>
