<template>
  <div class="contact-support-page">
    <PageHeader :title="t('contactAuthorPage.title')" @back="goHome" />

    <main class="page-main">
      <p class="description">{{ t("contactAuthorPage.description") }}</p>
      <a class="support-action" :href="supportLink">
        {{ t("home.contactAuthorAction") }}
      </a>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "@/components/common/PageHeader.vue";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/queries/usePublicConfig";

const DEFAULT_SUPPORT_LINK_WECHAT_IN =
  "https://work.weixin.qq.com/nl/act/p/3f8820e724cb44c5";
const DEFAULT_SUPPORT_LINK_WECHAT_OUT =
  "https://work.weixin.qq.com/nl/act/p/4030a5b69149404d";

const router = useRouter();
const { t } = useI18n();

const supportLinkWechatInQuery = usePublicConfig(
  PUBLIC_CONFIG_KEYS.wecomSupportLinkWechatIn,
);
const supportLinkWechatOutQuery = usePublicConfig(
  PUBLIC_CONFIG_KEYS.wecomSupportLinkWechatOut,
);

const normalizeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const supportLinkWechatIn = computed(
  () =>
    normalizeHttpUrl(supportLinkWechatInQuery.data.value?.value) ??
    DEFAULT_SUPPORT_LINK_WECHAT_IN,
);

const supportLinkWechatOut = computed(
  () =>
    normalizeHttpUrl(supportLinkWechatOutQuery.data.value?.value) ??
    DEFAULT_SUPPORT_LINK_WECHAT_OUT,
);

const supportLink = computed(() =>
  isWeChatBrowser() ? supportLinkWechatIn.value : supportLinkWechatOut.value,
);

const goHome = () => {
  router.push("/");
};
</script>

<style lang="scss" scoped>
.contact-support-page {
  margin: 0 auto;
  padding: var(--sys-spacing-med);
  min-height: var(--pu-vh);
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-med);
}

.description {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
  max-width: 28ch;
}

.support-action {
  @include mx.pu-font(label-large);
  min-width: 10rem;
  min-height: 2.75rem;
  padding: 0.65rem 1.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  text-decoration: none;
  transition:
    transform 180ms ease,
    opacity 180ms ease;

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}
</style>
