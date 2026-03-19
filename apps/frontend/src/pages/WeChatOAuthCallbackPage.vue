<template>
  <PageScaffoldCentered class="wechat-oauth-callback-page">
    <template #header>
      <header class="wechat-oauth-callback-page__header">
        <h1 class="wechat-oauth-callback-page__title">
          {{ t("wechatOAuthCallbackPage.title") }}
        </h1>
        <p class="wechat-oauth-callback-page__subtitle">
          {{ t("wechatOAuthCallbackPage.subtitle") }}
        </p>
      </header>
    </template>

    <section class="wechat-oauth-callback-page__card">
      <LoadingIndicator :message="statusMessage" />
    </section>
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { API_URL } from "@/lib/rpc";
import PageScaffoldCentered from "@/shared/ui/layout/PageScaffoldCentered.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";

const { t } = useI18n();

const statusMessage = computed(() => t("wechatOAuthCallbackPage.processing"));

const buildBackendCallbackUrlWithParams = (): URL => {
  const base = API_URL?.trim() || window.location.origin;
  const callbackUrl = new URL("/api/wechat/oauth/callback", base);
  const currentSearchParams = new URLSearchParams(window.location.search);
  currentSearchParams.forEach((value, key) => {
    callbackUrl.searchParams.append(key, value);
  });
  return callbackUrl;
};

onMounted(() => {
  window.location.replace(buildBackendCallbackUrlWithParams().toString());
});
</script>

<style scoped lang="scss">
.wechat-oauth-callback-page {
  --pu-page-max-width: 42rem;
}

.wechat-oauth-callback-page__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  align-items: center;
  text-align: center;
}

.wechat-oauth-callback-page__title,
.wechat-oauth-callback-page__subtitle {
  margin: 0;
}

.wechat-oauth-callback-page__title {
  @include mx.pu-font(title-large);
  color: var(--sys-color-on-surface);
}

.wechat-oauth-callback-page__subtitle {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.wechat-oauth-callback-page__card {
  @include mx.pu-surface-card(section);
}
</style>
