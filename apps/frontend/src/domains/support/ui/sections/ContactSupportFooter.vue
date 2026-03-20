<template>
  <footer class="contact-support-footer">
    <nav class="contact-support-nav" :aria-label="t('aboutPage.footerNavLabel')">
      <RouterLink class="contact-support-link" :to="{ name: 'contact-support' }">
        {{ t("contactAuthorPage.footerEntry") }}
      </RouterLink>
      <RouterLink class="contact-support-link" :to="{ name: 'about' }">
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
.contact-support-footer {
  margin-top: var(--sys-spacing-lg);
  padding-top: var(--sys-spacing-sm);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.contact-support-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm) var(--sys-spacing-med);
}

.contact-support-link {
  @include mx.pu-font(label-large);
  color: var(--sys-color-secondary);
  text-decoration: none;

  &:hover {
    color: var(--sys-color-on-primary-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-xs);
  }
}
</style>
