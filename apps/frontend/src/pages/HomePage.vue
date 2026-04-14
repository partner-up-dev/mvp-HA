<template>
  <div class="home-page" data-page="landing">
    <main class="home-flow">
      <section class="home-section home-section--hero" data-region="hero">
        <LandingHeroSection @reveal-values="handleHeroValuesReveal" />
        <LandingValuePropsSection
          class="hero-values"
          :start-reveal="shouldRevealHeroValues"
          data-region="value-props"
        />
      </section>

      <section class="home-section home-section--event">
        <div class="section-paper section-paper--event">
          <EventHighlightsSection
            class="event-canvas event-canvas--breakout"
            data-region="event-highlights"
          />
          <EventPlazaEntry data-region="event-plaza" />
        </div>
      </section>

      <section class="home-section home-section--creator">
        <div class="section-stack section-stack--creator">
          <header class="section-header section-header--creator">
            <h2>{{ t("home.landing.secondaryActionsTitle") }}</h2>
            <p>{{ t("home.landing.secondaryActionsHint") }}</p>
          </header>
          <RouterLink
            class="creator-entry"
            :to="{ name: 'community-pr-create' }"
            @click="handleFallbackCreateClick"
          >
            <div class="creator-copy">
              <h3>{{ t("home.landing.secondaryCreateTitle") }}</h3>
              <p>{{ t("home.landing.secondaryCreateDescription") }}</p>
            </div>
            <span class="creator-action-text">
              {{ t("home.landing.secondaryCreateAction") }}
              <span
                class="creator-action-icon i-mdi:arrow-right"
                aria-hidden="true"
              ></span>
            </span>
          </RouterLink>
          <LandingWeChatAccessSection />
        </div>
      </section>
    </main>

    <FullCommonFooter data-region="footer" />

    <LandingBookmarkNudge data-region="bookmark-nudge" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import LandingHeroSection from "@/domains/landing/ui/sections/LandingHeroSection.vue";
import LandingValuePropsSection from "@/domains/landing/ui/sections/LandingValuePropsSection.vue";
import EventHighlightsSection from "@/domains/event/ui/sections/landing/EventHighlightsSection.vue";
import EventPlazaEntry from "@/domains/event/ui/sections/landing/EventPlazaEntry.vue";
import LandingBookmarkNudge from "@/domains/landing/ui/sections/LandingBookmarkNudge.vue";
import FullCommonFooter from "@/domains/landing/ui/sections/FullCommonFooter.vue";
import LandingWeChatAccessSection from "@/domains/landing/ui/sections/LandingWeChatAccessSection.vue";
import { trackEvent } from "@/shared/telemetry/track";

const HOME_SCROLL_SNAP_CLASS = "home-scroll-snap";

const { t } = useI18n();

const shouldRevealHeroValues = ref(false);

const handleHeroValuesReveal = () => {
  shouldRevealHeroValues.value = true;
};

const handleFallbackCreateClick = () => {
  trackEvent("home_create_entry_click", {
    source: "fallback_section",
    target: "community-pr-create",
  });
};

onMounted(() => {
  if (typeof window === "undefined") return;
  document.documentElement.classList.add(HOME_SCROLL_SNAP_CLASS);
  document.body.classList.add(HOME_SCROLL_SNAP_CLASS);
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  document.documentElement.classList.remove(HOME_SCROLL_SNAP_CLASS);
  document.body.classList.remove(HOME_SCROLL_SNAP_CLASS);
});
</script>

<style lang="scss" scoped>
:global(html.home-scroll-snap),
:global(body.home-scroll-snap) {
  scroll-snap-type: y proximity;
}

.home-page {
  position: relative;
  isolation: isolate;
  overflow-x: clip;
  min-height: var(--pu-vh);
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
  width: clamp(11rem, 32vw, 18rem);
  height: clamp(11rem, 32vw, 18rem);
  top: clamp(2rem, 8vh, 6rem);
  right: -20vw;
  background: color-mix(in srgb, var(--sys-color-tertiary) 18%, transparent);
  filter: blur(10px);
  animation: home-glow-drift-a 16s ease-in-out infinite alternate;
}

.home-page::after {
  width: clamp(9rem, 26vw, 15rem);
  height: clamp(9rem, 26vw, 15rem);
  top: clamp(20rem, 42vh, 32rem);
  left: -14vw;
  background: color-mix(in srgb, var(--sys-color-primary) 16%, transparent);
  filter: blur(6px);
  animation: home-glow-drift-b 14s ease-in-out infinite alternate;
}

.home-page > .home-flow,
.home-page > .home-section--footer {
  position: relative;
  z-index: 1;
}

.home-flow {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.home-section {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: normal;
  justify-content: center;
  gap: var(--dcs-space-landing-section-gap);
  padding-block: var(--dcs-space-landing-section-padding-block);
  padding-left: calc(var(--sys-spacing-med) + var(--pu-safe-left));
  padding-right: calc(var(--sys-spacing-med) + var(--pu-safe-right));
  opacity: 0;
  transform: translate3d(0, 0.8rem, 0);
  animation: section-enter 620ms cubic-bezier(0.22, 0.72, 0.2, 1) forwards;
}

.home-section--hero {
  min-height: var(--pu-vh);
  justify-content: space-between;
  padding-top: calc(
    var(--dcs-space-landing-section-padding-block) + var(--pu-safe-top)
  );
  animation-delay: 40ms;
}

.home-section--event {
  animation-delay: 100ms;
}

.hero-values {
  margin-top: auto;
}

.home-section--creator {
  justify-content: center;
  animation-delay: 150ms;
}

.event-canvas {
  width: 100%;
  min-width: 0;
}

.event-canvas--breakout {
  position: relative;
  z-index: 2;
}

.section-stack {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dcs-space-landing-panel-gap);
}

.section-stack--creator {
  max-width: min(100%, 32rem);
  padding-top: var(--sys-spacing-sm);
  border-top: 1px dashed
    color-mix(in srgb, var(--sys-color-outline) 44%, transparent);
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

.section-header--creator h2 {
  @include mx.pu-font(title-large);
}

.section-paper {
  width: 100%;
  min-width: 0;
  border-radius: var(--sys-radius-lg);
  border: 1px solid var(--sys-color-outline);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--dcs-space-landing-panel-gap);
  padding: var(--dcs-space-landing-panel-padding);
  @include mx.pu-elevation(1);
}

.section-paper--event {
  justify-content: flex-start;
  position: relative;
  z-index: 1;
  overflow: visible;
}

.creator-entry {
  text-decoration: none;
  padding: var(--dcs-space-landing-entry-padding);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--sys-spacing-sm);
  border: 1px dashed
    color-mix(in srgb, var(--sys-color-outline) 58%, transparent);
  border-radius: var(--sys-radius-med);
  background: color-mix(
    in srgb,
    var(--sys-color-surface-container-low) 72%,
    transparent
  );
  transition:
    transform 210ms ease,
    border-color 210ms ease,
    background-color 210ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--sys-color-primary) 45%, transparent);
    background: color-mix(
      in srgb,
      var(--sys-color-primary-container) 34%,
      var(--sys-color-surface-container-low)
    );
  }

  &:active {
    transform: scale(0.99);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 3px;
  }
}

.creator-copy {
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

.creator-action-text {
  @include mx.pu-font(label-large);
  color: var(--sys-color-primary);
  flex-shrink: 0;
  transition:
    transform 180ms ease,
    color 180ms ease;

  .creator-action-icon {
    margin-left: var(--sys-spacing-xs);
    display: inline-block;
    vertical-align: middle;
    @include mx.pu-icon(medium);
  }
}

.creator-entry:hover .creator-action-text {
  transform: translateX(4px);
}

@media (max-width: 768px) {
  .home-section {
    gap: var(--dcs-space-landing-section-gap-compact);
    padding-left: calc(
      var(--dcs-space-landing-section-padding-inline-compact) +
        var(--pu-safe-left)
    );
    padding-right: calc(
      var(--dcs-space-landing-section-padding-inline-compact) +
        var(--pu-safe-right)
    );
  }

  .section-paper {
    padding: var(--dcs-space-landing-panel-padding-compact);
  }

  .section-header h2 {
    @include mx.pu-font(title-large);
  }

  .section-header p {
    @include mx.pu-font(body-large);
  }

  .creator-entry {
    min-height: 3.7rem;
    padding: var(--dcs-space-landing-entry-padding-compact);
  }

  .creator-copy h3 {
    @include mx.pu-font(title-large);
  }

  .creator-copy p {
    @include mx.pu-font(body-large);
  }

  .creator-action-text {
    @include mx.pu-font(title-medium);
  }
}

@keyframes section-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 0.8rem, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes home-glow-drift-a {
  from {
    transform: translate3d(0, 0, 0) scale(0.94);
  }
  to {
    transform: translate3d(-1.2rem, 1rem, 0) scale(1.08);
  }
}

@keyframes home-glow-drift-b {
  from {
    transform: translate3d(0, 0, 0) scale(0.92);
  }
  to {
    transform: translate3d(1rem, -0.6rem, 0) scale(1.05);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-page::before,
  .home-page::after,
  .home-section,
  .creator-entry,
  .creator-action-text,
  .footer-nav-link,
  .footer-nav-link::before {
    animation: none !important;
    transition: none !important;
  }
}
</style>
