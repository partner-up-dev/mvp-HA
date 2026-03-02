<template>
  <div class="home-page">
    <Swiper
      class="home-swiper"
      v-bind="pageSwiperOptions"
      :modules="pageSwiperModules"
      @swiper="handleSwiperReady"
    >
      <SwiperSlide class="home-swiper-slide">
        <section class="home-section home-section--hero">
          <HomeHero @reveal-values="handleHeroValuesReveal" />
          <HomeValueProps
            class="hero-values"
            :start-reveal="shouldRevealHeroValues"
          />
        </section>
      </SwiperSlide>

      <SwiperSlide class="home-swiper-slide">
        <section class="home-section home-section--event">
          <div class="section-paper section-paper--event">
            <HomeEventHighlights />
            <HomeEventPlazaEntry />
          </div>
        </section>
      </SwiperSlide>

      <SwiperSlide class="home-swiper-slide">
        <section class="home-section home-section--creator">
          <div class="section-paper section-paper--creator">
            <header class="section-header section-header--creator">
              <h2>{{ t("home.landing.secondaryActionsTitle") }}</h2>
              <p>{{ t("home.landing.secondaryActionsHint") }}</p>
            </header>
            <section class="creator-actions">
              <RouterLink class="creator-entry" :to="{ name: 'pr-new' }">
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
            </section>
          </div>
        </section>
      </SwiperSlide>
    </Swiper>

    <HomeFooter />

    <HomeBookmarkNudge />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import type { Swiper as SwiperInstance } from "swiper";
import { Swiper, SwiperSlide } from "swiper/vue";
import { A11y, FreeMode, Mousewheel } from "swiper/modules";
import "swiper/css";
import HomeHero from "@/widgets/home/HomeHero.vue";
import HomeValueProps from "@/widgets/home/HomeValueProps.vue";
import HomeEventHighlights from "@/widgets/home/HomeEventHighlights.vue";
import HomeEventPlazaEntry from "@/widgets/home/HomeEventPlazaEntry.vue";
import HomeBookmarkNudge from "@/widgets/home/HomeBookmarkNudge.vue";
import HomeFooter from "@/widgets/home/HomeFooter.vue";

const { t } = useI18n();

// footer moved to HomeFooter component

const pageSwiperModules = [Mousewheel, FreeMode, A11y];

const pageSwiperOptions = {
  direction: "vertical" as const,
  initialSlide: 0,
  slidesPerView: 1,
  autoHeight: false,
  speed: 620,
  resistanceRatio: 0.4,
  threshold: 0,
  touchReleaseOnEdges: true,
  touchStartPreventDefault: false,
  noSwiping: true,
  noSwipingSelector: ".highlights-list",
  longSwipesRatio: 0.14,
  freeMode: {
    enabled: true,
    sticky: true,
    momentum: true,
    minimumVelocity: 0.08,
    momentumRatio: 0.48,
    momentumVelocityRatio: 0.7,
  },
  mousewheel: {
    forceToAxis: true,
    releaseOnEdges: true,
    thresholdDelta: 8,
    sensitivity: 0.92,
  },
};

const FOOTER_SCROLL_THRESHOLD = 1;
const swiperRef = ref<SwiperInstance | null>(null);
const shouldRevealHeroValues = ref(false);
const initialResetFrame = ref<number | null>(null);
const initialResetTimeoutId = ref<number | null>(null);

const handleHeroValuesReveal = () => {
  shouldRevealHeroValues.value = true;
};

const setSwiperInteractionEnabled = (enabled: boolean) => {
  const swiper = swiperRef.value;
  if (!swiper) return;

  swiper.allowTouchMove = enabled;
  if (swiper.mousewheel) {
    if (enabled) {
      swiper.mousewheel.enable();
    } else {
      swiper.mousewheel.disable();
    }
  }
};

const syncSwiperInteractionWithPageScroll = () => {
  if (typeof window === "undefined") return;
  const shouldEnableSwiper = window.scrollY <= FOOTER_SCROLL_THRESHOLD;
  setSwiperInteractionEnabled(shouldEnableSwiper);
};

const resetViewportToHero = () => {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  const swiper = swiperRef.value;
  if (!swiper) {
    syncSwiperInteractionWithPageScroll();
    return;
  }

  swiper.slideTo(0, 0, false);
  swiper.updateSlidesClasses();
  syncSwiperInteractionWithPageScroll();
};

const scheduleInitialViewportReset = () => {
  if (typeof window === "undefined") return;
  resetViewportToHero();

  initialResetFrame.value = window.requestAnimationFrame(() => {
    resetViewportToHero();
  });

  initialResetTimeoutId.value = window.setTimeout(() => {
    resetViewportToHero();
  }, 96);
};

const handleSwiperReady = (swiper: SwiperInstance) => {
  swiperRef.value = swiper;
  resetViewportToHero();
};

onMounted(() => {
  if (typeof window === "undefined") return;
  window.addEventListener("scroll", syncSwiperInteractionWithPageScroll, {
    passive: true,
  });
  window.addEventListener("resize", syncSwiperInteractionWithPageScroll, {
    passive: true,
  });
  scheduleInitialViewportReset();
});

onUnmounted(() => {
  if (typeof window === "undefined") return;
  window.removeEventListener("scroll", syncSwiperInteractionWithPageScroll);
  window.removeEventListener("resize", syncSwiperInteractionWithPageScroll);
  if (initialResetFrame.value !== null) {
    window.cancelAnimationFrame(initialResetFrame.value);
  }
  if (initialResetTimeoutId.value !== null) {
    window.clearTimeout(initialResetTimeoutId.value);
  }
  swiperRef.value = null;
});
</script>

<style lang="scss" scoped>
.home-page {
  --home-section-min-height: var(--pu-vh);
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

.home-page > * {
  position: relative;
  z-index: 1;
}

.home-section {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  justify-content: center;
  gap: clamp(1rem, 4vw, 1.9rem);
  padding-block: clamp(1.25rem, 5vw, 3rem);
  padding-left: calc(var(--sys-spacing-med) + var(--pu-safe-left));
  padding-right: calc(var(--sys-spacing-med) + var(--pu-safe-right));
  opacity: 0;
  transform: translate3d(0, 1rem, 0);
  animation: section-enter 680ms cubic-bezier(0.22, 0.65, 0.2, 1) forwards;
}

.home-section--hero {
  justify-content: space-between;
  padding-top: calc(clamp(1.25rem, 5vw, 3rem) + var(--pu-safe-top));
  animation-delay: 60ms;
}

.home-section--event {
  animation-delay: 130ms;
}

.hero-values {
  margin-top: auto;
}

.home-section--creator {
  justify-content: center;
  animation-delay: 200ms;
}

.home-swiper {
  width: 100%;
  height: var(--home-section-min-height);
  min-height: var(--home-section-min-height);
}

.home-swiper-slide {
  display: flex;
  align-items: stretch;
  height: 100%;
  min-height: 0;
}

.home-swiper-slide :deep(.home-section) {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.home-swiper :deep(.swiper-wrapper) {
  align-items: stretch;
}

.home-swiper :deep(.swiper-slide) {
  height: 100%;
}

.home-section--event,
.home-section--creator {
  height: 100%;
  min-height: 0;
}

.section-paper {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: var(--sys-radius-lg);
  border: 1px solid var(--sys-color-outline);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(1rem, 4vw, 1.9rem);
  @include mx.pu-elevation(1);
}

.section-paper--event {
  justify-content: flex-start;
  overflow: hidden;
}

.section-paper--event :deep(.event-highlights) {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.section-paper--creator {
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

.creator-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.creator-entry {
  text-decoration: none;
  padding: clamp(0.95rem, 3.8vw, 1.45rem);
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--sys-spacing-sm);
  border: 1px solid
    color-mix(in srgb, var(--sys-color-outline) 52%, transparent);
  border-radius: var(--sys-radius-med);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--sys-color-primary) 10%, transparent),
      transparent 58%
    ),
    var(--sys-color-surface-container-lowest);
  @include mx.pu-elevation(1);
  transition:
    transform 210ms ease,
    box-shadow 210ms ease,
    border-color 210ms ease,
    background-color 210ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--sys-color-primary) 45%, transparent);
    @include mx.pu-elevation(3);
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
    gap: clamp(1.35rem, 5vw, 2.3rem);
    padding-left: calc(clamp(1rem, 4.8vw, 1.3rem) + var(--pu-safe-left));
    padding-right: calc(clamp(1rem, 4.8vw, 1.3rem) + var(--pu-safe-right));
  }

  .section-paper {
    padding: clamp(1.12rem, 4.8vw, 1.58rem);
  }

  .section-header h2 {
    @include mx.pu-font(title-large);
  }

  .section-header p {
    @include mx.pu-font(body-large);
  }

  .creator-entry {
    min-height: 3.7rem;
    padding: clamp(1.1rem, 4.8vw, 1.52rem);
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
  .footer-brand-main h2 {
    @include mx.pu-font(headline-small);
  }

  .footer-brand p {
    @include mx.pu-font(body-large);
  }
}

@keyframes section-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 1rem, 0);
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
