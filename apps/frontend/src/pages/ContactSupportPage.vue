<template>
  <div class="contact-support-page">
    <PageHeader :title="t('contactSupportPage.title')" @back="goHome" />

    <main class="page-main">
      <p class="description">{{ t("contactSupportPage.description") }}</p>

      <section class="guidance-list" :aria-label="t('contactSupportPage.guideTitle')">
        <h2>{{ t("contactSupportPage.guideTitle") }}</h2>
        <ul>
          <li>{{ t("contactSupportPage.useCases.support") }}</li>
          <li>{{ t("contactSupportPage.useCases.author") }}</li>
        </ul>
      </section>

      <a class="support-action" :href="supportLink" target="_blank" rel="noopener noreferrer">
        {{ t("contactSupportPage.supportAction") }}
      </a>

      <RouterLink class="author-link" :to="{ name: 'contact-author' }">
        {{ t("contactSupportPage.authorEntry") }}
      </RouterLink>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
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

const resolveSupportLink = (
  configuredValue: string | null | undefined,
  fallback: string,
): string => {
  return normalizeHttpUrl(configuredValue) ?? fallback;
};

const supportLinkWechatIn = computed(
  () => {
    if (
      supportLinkWechatInQuery.isLoading.value ||
      supportLinkWechatInQuery.error.value
    ) {
      return DEFAULT_SUPPORT_LINK_WECHAT_IN;
    }

    return resolveSupportLink(
      supportLinkWechatInQuery.data.value?.value,
      DEFAULT_SUPPORT_LINK_WECHAT_IN,
    );
  },
);

const supportLinkWechatOut = computed(
  () => {
    if (
      supportLinkWechatOutQuery.isLoading.value ||
      supportLinkWechatOutQuery.error.value
    ) {
      return DEFAULT_SUPPORT_LINK_WECHAT_OUT;
    }

    return resolveSupportLink(
      supportLinkWechatOutQuery.data.value?.value,
      DEFAULT_SUPPORT_LINK_WECHAT_OUT,
    );
  },
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
  max-width: 32ch;
}

.guidance-list {
  width: min(100%, 33rem);
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  border-radius: var(--sys-radius-md);
  background: var(--sys-color-surface-container);

  h2 {
    @include mx.pu-font(title-small);
    margin: 0 0 var(--sys-spacing-xs);
    color: var(--sys-color-on-surface);
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
    display: grid;
    gap: var(--sys-spacing-xs);
  }

  li {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
  }
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

.author-link {
  @include mx.pu-font(label-large);
  color: var(--sys-color-secondary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-xs);
  }
}

@media (max-width: 768px) {
  .page-main {
    align-items: stretch;
  }

  .description,
  .author-link {
    text-align: center;
  }

  .support-action {
    width: 100%;
  }
}
</style>
