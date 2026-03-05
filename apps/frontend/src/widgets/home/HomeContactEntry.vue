<template>
  <RouterLink class="contact-entry" :to="{ name: 'contact-support' }">
    <div class="contact-copy">
      <h2>{{ t("home.contactAuthorTitle") }}</h2>
      <p>{{ t("home.contactAuthorDescription") }}</p>
    </div>
    <span class="contact-action">
      {{ t("home.contactAuthorAction") }}
      <span
        class="contact-action-icon i-mdi:arrow-right"
        aria-hidden="true"
      ></span>
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
  padding: calc(var(--sys-spacing-xs) + 0.15rem) 0.2rem;
  min-height: 3rem;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  transition: opacity 180ms ease;

  &:hover {
    opacity: 0.88;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
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
  transition: transform 180ms ease;

  .contact-action-icon {
    margin-left: var(--sys-spacing-xs);
    display: inline-block;
    vertical-align: middle;
    @include mx.pu-icon(medium);
  }
}

.contact-entry:hover .contact-action {
  transform: translateX(3px);
}

@media (max-width: 768px) {
  .contact-entry {
    min-height: 3.4rem;
    padding: calc(var(--sys-spacing-sm) + 0.2rem) 0.25rem;
  }

  .contact-copy h2 {
    @include mx.pu-font(title-large);
  }

  .contact-copy p {
    @include mx.pu-font(body-large);
  }

  .contact-action {
    @include mx.pu-font(title-small);
  }
}
</style>
