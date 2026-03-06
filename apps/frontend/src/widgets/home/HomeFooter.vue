<template>
  <footer class="home-section home-section--footer">
    <section class="footer-brand">
      <nav class="footer-nav" :aria-label="t('home.landing.footerNavTitle')">
        <RouterLink
          v-for="link in footerNavLinks"
          :key="link.routeName"
          class="footer-nav-link"
          :to="{ name: link.routeName }"
        >
          <span class="footer-nav-label">{{ link.label }}</span>
          <span
            class="footer-nav-icon i-mdi:arrow-right"
            aria-hidden="true"
          ></span>
        </RouterLink>
      </nav>
      <div class="footer-brand-main">
        <img
          class="footer-brand-logo"
          src="/share-logo.png"
          :alt="t('app.name')"
          width="48"
          height="48"
          loading="lazy"
          decoding="async"
        />
        <h2>{{ t("app.name") }}</h2>
      </div>
      <p>{{ t("home.landing.footerIntroBody") }}</p>
    </section>

    <section class="footer-legal">
      <p class="footer-copyright">© 搭一把科技有限公司</p>
      <a href="https://beian.miit.gov.cn/" class="footer-beian"
        >粤ICP备2024324879号</a
      >
    </section>
  </footer>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const footerNavLinks = computed(() => [
  {
    routeName: "event-plaza",
    label: t("eventPlaza.title"),
  },
  {
    routeName: "pr-new",
    label: t("createPage.title"),
  },
  {
    routeName: "pr-mine",
    label: t("home.landing.footerNavMine"),
  },
  {
    routeName: "contact-support",
    label: t("contactSupportPage.title"),
  },
]);
</script>

<style lang="scss" scoped>
.home-section--footer {
  justify-content: flex-start;
  gap: clamp(1.3rem, 4.8vw, 2rem);
  padding-bottom: calc(clamp(1.25rem, 5vw, 3rem) + var(--pu-safe-bottom));
  animation-delay: 260ms;
  background-color: var(--sys-color-surface-container);
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.footer-brand-main {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-sm);

  h2 {
    @include mx.pu-font(title-large);
    color: var(--sys-color-on-surface);
    line-height: var(--sys-size-large);
    margin: 0;
  }
}

.footer-brand-logo {
  width: var(--sys-size-large);
  height: var(--sys-size-large);
  border-radius: var(--sys-radius-sm);
  object-fit: cover;
}

.footer-brand p {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  max-width: 34ch;
  margin: 0;
}

.footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
}

.footer-nav-link {
  @include mx.pu-font(label-large);
  position: relative;
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 2.75rem;
  color: var(--sys-color-on-surface-variant);
  text-decoration: none;

  transition:
    color 180ms ease,
    opacity 180ms ease;
  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -2px;
    height: 1px;
    background: currentColor;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 180ms ease;
  }

  .footer-nav-icon {
    margin-left: var(--sys-spacing-xs);
    display: inline-block;
    vertical-align: middle;
    // color: var(--sys-color-secondary);
    @include mx.pu-icon(medium);
  }

  // .footer-nav-label {
  //   text-decoration: underline;
  //   text-underline-offset: 3px;
  // }

  &:hover {
    color: var(--sys-color-on-surface);
  }

  &:hover::before {
    transform: scaleX(1);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.footer-legal {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs);
  font-size: 0.75rem;
  color: var(--sys-color-on-surface-variant);
}

.footer-copyright {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
}

.footer-beian {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
  text-decoration: none;
  transition:
    color 180ms ease,
    text-decoration 180ms ease;

  &:hover {
    color: var(--sys-color-primary);
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

@media (max-width: 768px) {
  .footer-brand-main h2 {
    @include mx.pu-font(headline-small);
  }

  .footer-brand p {
    @include mx.pu-font(body-large);
  }

  .footer-nav {
    gap: var(--sys-spacing-xs) var(--sys-spacing-med);
  }

  .footer-nav-link {
    @include mx.pu-font(title-small);
    min-height: 3rem;
    padding: 0.38rem 0.25rem;
  }

  .footer-legal {
    gap: var(--sys-spacing-xs);
    font-size: 0.7rem;
  }

  .footer-copyright,
  .footer-beian {
    @include mx.pu-font(label-medium);
  }
}
</style>
