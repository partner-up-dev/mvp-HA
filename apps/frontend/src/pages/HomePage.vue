<template>
  <div class="home-page">
    <header class="header">
      <h1>{{ t("home.title") }}</h1>
      <p>{{ t("home.subtitle") }}</p>
    </header>

    <main class="main">
      <section class="entry-panel">
        <HomeStructuredCreateCta />
        <HomeNLCreatePanel />
      </section>

      <CreatedPRList empty-mode="hide" />
    </main>

    <RouterLink class="contact-entry" :to="{ name: 'contact-author' }">
      <h2>{{ t("home.contactAuthorTitle") }}</h2>
      <p>{{ t("home.contactAuthorDescription") }}</p>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import CreatedPRList from "@/components/pr/CreatedPRList.vue";
import HomeNLCreatePanel from "@/components/home/HomeNLCreatePanel.vue";
import HomeStructuredCreateCta from "@/components/home/HomeStructuredCreateCta.vue";
import { usePageWeChatShare } from "@/composables/usePageWeChatShare";

const { t } = useI18n();

usePageWeChatShare({
  title: () => t("app.siteName"),
  desc: () => t("home.subtitle"),
});
</script>

<style lang="scss" scoped>
.home-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}

.header {
  padding: var(--sys-spacing-lg) 0;

  h1 {
    @include mx.pu-font(headline-large);
    color: var(--sys-color-primary);
    margin: 0;
  }
  p {
    @include mx.pu-font(body-large);
    color: var(--sys-color-on-surface-variant);
  }
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.entry-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-lg);
}

.contact-entry {
  text-decoration: none;
  margin-top: var(--sys-spacing-lg);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-med);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2 {
    @include mx.pu-font(title-medium);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}
</style>
