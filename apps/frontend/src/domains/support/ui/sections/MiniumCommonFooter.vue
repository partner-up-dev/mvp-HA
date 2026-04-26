<template>
  <footer class="minium-common-footer">
    <nav
      class="minium-common-footer__nav"
      :aria-label="t('aboutPage.footerNavLabel')"
    >
      <RouterLink class="minium-common-footer__link" :to="{ name: 'me' }">
        {{ t("home.landing.footerNavMine") }}
      </RouterLink>
      <RouterLink
        class="minium-common-footer__link"
        :to="{ name: 'contact-support' }"
      >
        {{ t("contactAuthorPage.footerEntry") }}
      </RouterLink>
      <RouterLink class="minium-common-footer__link" :to="{ name: 'about' }">
        {{ t("aboutPage.footerEntry") }}
      </RouterLink>
    </nav>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.minium-common-footer {
  margin-top: var(--sys-spacing-large);
  padding-top: var(--sys-spacing-small);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.minium-common-footer__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.minium-common-footer__link {
  @include mx.pu-font(label-large);
  color: var(--sys-color-secondary);
  text-decoration: none;

  &:hover {
    color: var(--sys-color-on-primary-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-xsmall);
  }
}
</style>
