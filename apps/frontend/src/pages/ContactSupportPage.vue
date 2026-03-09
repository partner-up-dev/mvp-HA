<template>
  <PageScaffoldCentered class="contact-support-page">
    <template #header>
      <PageHeader :title="t('contactSupportPage.title')" @back="goHome" />
    </template>

    <section
      class="guidance-list"
      :aria-label="t('contactSupportPage.guideTitle')"
    >
      <h2>{{ t("contactSupportPage.guideTitle") }}</h2>
      <ul>
        <li>{{ t("contactSupportPage.useCases.employee") }}</li>
        <li>{{ t("contactSupportPage.useCases.support") }}</li>
      </ul>
    </section>

    <section
      class="contact-actions"
      :aria-label="t('contactSupportPage.actionsTitle')"
    >
      <div class="contact-card">
        <div class="contact-copy">
          <h2>{{ t("contactSupportPage.employeeTitle") }}</h2>
          <p>{{ t("contactSupportPage.employeeDescription") }}</p>
        </div>

        <a
          class="contact-action"
          :href="staffLink"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t("contactSupportPage.employeeAction") }}
        </a>
      </div>

      <div class="contact-card contact-card--support">
        <div class="contact-copy">
          <h2>{{ t("contactSupportPage.supportTitle") }}</h2>
          <p>{{ t("contactSupportPage.supportDescription") }}</p>
        </div>

        <a
          class="contact-action"
          :href="supportLink"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t("contactSupportPage.supportAction") }}
        </a>
      </div>
    </section>

    <RouterLink class="author-link" :to="{ name: 'contact-author' }">
      {{ t("contactSupportPage.authorEntry") }}
    </RouterLink>
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "@/components/common/PageHeader.vue";
import PageScaffoldCentered from "@/widgets/common/PageScaffoldCentered.vue";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/queries/usePublicConfig";

const DEFAULT_SUPPORT_LINK_WECHAT_IN =
  "https://work.weixin.qq.com/nl/act/p/3f8820e724cb44c5";
const DEFAULT_SUPPORT_LINK_WECHAT_OUT =
  "https://work.weixin.qq.com/nl/act/p/4030a5b69149404d";
const DEFAULT_STAFF_LINK = "https://work.weixin.qq.com/ca/cawcdeaeb65ab3d47f";

const router = useRouter();
const { t } = useI18n();

const supportLinkWechatInQuery = usePublicConfig(
  PUBLIC_CONFIG_KEYS.wecomSupportLinkWechatIn,
);
const supportLinkWechatOutQuery = usePublicConfig(
  PUBLIC_CONFIG_KEYS.wecomSupportLinkWechatOut,
);
const staffLinkQuery = usePublicConfig(PUBLIC_CONFIG_KEYS.wecomStaffLink);

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

const supportLinkWechatIn = computed(() => {
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
});

const supportLinkWechatOut = computed(() => {
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
});

const supportLink = computed(() =>
  isWeChatBrowser() ? supportLinkWechatIn.value : supportLinkWechatOut.value,
);

const staffLink = computed(() => {
  if (staffLinkQuery.isLoading.value || staffLinkQuery.error.value) {
    return DEFAULT_STAFF_LINK;
  }

  return resolveSupportLink(
    staffLinkQuery.data.value?.value,
    DEFAULT_STAFF_LINK,
  );
});

const goHome = () => {
  router.push("/");
};
</script>

<style lang="scss" scoped>
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

.contact-actions {
  width: min(100%, 33rem);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-med);
}

.contact-card {
  padding: var(--sys-spacing-med);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-md);
  display: grid;
  gap: var(--sys-spacing-sm);
  justify-items: center;
  background: var(--sys-color-surface);
}

.contact-card--support {
  align-content: space-between;
}

.contact-copy {
  display: grid;
  gap: var(--sys-spacing-xs);
  text-align: center;

  h2 {
    @include mx.pu-font(title-small);
    margin: 0;
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body-medium);
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.contact-action {
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
  .contact-support-page :deep(.page-scaffold-centered__main) {
    align-items: stretch;
  }

  .contact-actions {
    grid-template-columns: 1fr;
  }

  .author-link {
    text-align: center;
  }

  .contact-action {
    width: 100%;
  }

  .contact-card {
    justify-items: stretch;
  }

  .contact-copy {
    text-align: left;
  }
}
</style>
