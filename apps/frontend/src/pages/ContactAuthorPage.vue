<template>
  <div class="contact-author-page">
    <header class="page-header">
      <button
        class="home-btn"
        @click="goHome"
        :aria-label="t('common.backToHome')"
      >
        <div class="i-mdi-arrow-left font-title-large"></div>
      </button>
      <h1>{{ t("contactAuthorPage.title") }}</h1>
    </header>

    <LoadingIndicator
      v-if="publicConfigQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <ErrorToast
      v-else-if="publicConfigQuery.error.value"
      :message="
        publicConfigQuery.error.value instanceof Error
          ? publicConfigQuery.error.value.message
          : t('errors.fetchPublicConfigFailed')
      "
      persistent
    />

    <main v-else class="page-main">
      <p class="description">{{ t("contactAuthorPage.description") }}</p>
      <div class="qr-frame">
        <img
          v-if="qrCodeUrl"
          :src="qrCodeUrl"
          :alt="t('contactAuthorPage.qrAlt')"
          class="qr-image"
        />
        <p v-else class="qr-empty">
          {{ t("contactAuthorPage.qrMissing") }}
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import LoadingIndicator from "@/components/common/LoadingIndicator.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/queries/usePublicConfig";
import { usePageWeChatShare } from "@/composables/usePageWeChatShare";

const router = useRouter();
const { t } = useI18n();
const publicConfigQuery = usePublicConfig(
  PUBLIC_CONFIG_KEYS.authorWechatQrCode,
);

const qrCodeUrl = computed(() => publicConfigQuery.data.value?.value ?? null);

usePageWeChatShare({
  title: () => `${t("contactAuthorPage.title")} - ${t("app.name")}`,
  desc: () => t("contactAuthorPage.description"),
});

const goHome = () => {
  router.push("/");
};
</script>

<style lang="scss" scoped>
.contact-author-page {
  margin: 0 auto;
  padding: var(--sys-spacing-med);
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-lg);

  h1 {
    @include mx.pu-font(headline-small);
    color: var(--sys-color-on-surface);
    margin: 0;
  }
}

.home-btn {
  display: flex;
  background: transparent;
  border: none;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  min-width: var(--sys-size-large);
  min-height: var(--sys-size-large);
  border-radius: 999px;
  align-items: center;
  justify-content: center;

  &:hover {
    background: var(--sys-color-surface-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.page-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-lg);
}

.description {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.qr-frame {
  width: min(100%, 280px);
  aspect-ratio: 1 / 1;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sys-spacing-sm);
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-empty {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}
</style>
