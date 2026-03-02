<template>
  <RouterLink class="contact-entry" :to="{ name: 'contact-author' }">
    <div class="contact-copy">
      <h2>{{ t("home.contactAuthorTitle") }}</h2>
      <p>{{ t("home.contactAuthorDescription") }}</p>
    </div>
    <span class="contact-action">
      {{ t("home.contactAuthorAction") }}
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.contact-entry {
  text-decoration: none;
  padding: var(--sys-spacing-xs) 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  border-top: 1px dashed color-mix(in srgb, var(--sys-color-outline) 55%, transparent);
}

.contact-copy {
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
  }
}

.contact-action {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;

  &::after {
    content: " \2192";
  }
}
</style>
