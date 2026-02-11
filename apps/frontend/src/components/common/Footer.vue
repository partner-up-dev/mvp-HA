<template>
  <footer class="contact-author-footer">
    <RouterLink class="contact-author-link" :to="{ name: 'contact-author' }">
      {{ t("contactAuthorPage.footerEntry") }}
    </RouterLink>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.contact-author-footer {
  margin-top: var(--sys-spacing-lg);
  padding-top: var(--sys-spacing-sm);
  border-top: 1px solid var(--sys-color-outline-variant);
  text-align: center;
}

.contact-author-link {
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
