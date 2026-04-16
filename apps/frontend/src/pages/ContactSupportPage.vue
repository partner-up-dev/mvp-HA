<template>
  <PageScaffoldCentered class="contact-support-page">
    <template #header>
      <PageHeader :title="t('contactSupportPage.title')" />
    </template>

    <section
      class="contact-actions"
      :aria-label="t('contactSupportPage.actionsTitle')"
    >
      <div class="contact-card contact-card--staff">
        <span class="contact-badge contact-badge--staff">
          {{ t("contactSupportPage.staffBadge") }}
        </span>
        <div class="contact-copy">
          <h2>{{ t("contactSupportPage.staffTitle") }}</h2>
          <p>{{ t("contactSupportPage.staffDescription") }}</p>
        </div>

        <component
          class="contact-action"
          :is="staffActionTag"
          v-bind="staffActionProps"
          @click="handleStaffAction"
        >
          {{ t("contactSupportPage.staffAction") }}
        </component>
      </div>

      <div class="contact-card contact-card--support">
        <span class="contact-badge contact-badge--support">
          {{ t("contactSupportPage.supportBadge") }}
        </span>
        <div class="contact-copy">
          <h2>{{ t("contactSupportPage.supportTitle") }}</h2>
          <p>{{ t("contactSupportPage.supportDescription") }}</p>
        </div>

        <component
          class="contact-action contact-action--support"
          :is="supportActionTag"
          v-bind="supportActionProps"
          @click="handleSupportAction"
        >
          {{ t("contactSupportPage.supportAction") }}
        </component>
      </div>

      <div class="contact-card contact-card--beta-group">
        <span class="contact-badge contact-badge--beta-group">
          {{ t("contactSupportPage.betaGroupBadge") }}
        </span>
        <div class="contact-copy">
          <h2>{{ t("contactSupportPage.betaGroupTitle") }}</h2>
          <p>{{ t("contactSupportPage.betaGroupDescription") }}</p>
        </div>

        <RouterLink
          class="contact-action contact-action--beta-group"
          :to="{ name: 'about', hash: '#beta-groups' }"
        >
          {{ t("contactSupportPage.betaGroupAction") }}
        </RouterLink>
      </div>
    </section>

    <nav class="support-entry-links" :aria-label="t('aboutPage.footerNavLabel')">
      <RouterLink class="support-entry-link" :to="{ name: 'contact-author' }">
        {{ t("contactSupportPage.authorEntry") }}
      </RouterLink>
      <RouterLink class="support-entry-link" :to="{ name: 'about' }">
        {{ t("aboutPage.title") }}
      </RouterLink>
    </nav>

    <SupportContactQrModal
      :open="staffQrModalOpen"
      :title="t('contactSupportPage.staffQrModalTitle')"
      :description="t('contactSupportPage.staffQrModalDescription')"
      :target-url="staffLink"
      :qr-alt="t('contactSupportPage.staffQrAlt')"
      :missing-text="t('contactSupportPage.staffQrMissing')"
      @close="staffQrModalOpen = false"
    />

    <SupportContactQrModal
      :open="supportQrModalOpen"
      :title="t('contactSupportPage.supportQrModalTitle')"
      :description="t('contactSupportPage.supportQrModalDescription')"
      :target-url="supportLink"
      :qr-alt="t('contactSupportPage.supportQrAlt')"
      :missing-text="t('contactSupportPage.supportQrMissing')"
      @close="supportQrModalOpen = false"
    />
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import SupportContactQrModal from "@/domains/support/ui/sections/SupportContactQrModal.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PageScaffoldCentered from "@/shared/ui/layout/PageScaffoldCentered.vue";
import { isWeChatBrowser } from "@/shared/browser/isWeChatBrowser";
import { useWeChatMiniProgramWebView } from "@/shared/wechat/useWeChatMiniProgramWebView";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/shared/config/queries/usePublicConfig";

const DEFAULT_SUPPORT_LINK_WECHAT_IN =
  "https://work.weixin.qq.com/nl/act/p/3f8820e724cb44c5";
const DEFAULT_SUPPORT_LINK_WECHAT_OUT =
  "https://work.weixin.qq.com/nl/act/p/4030a5b69149404d";
const DEFAULT_STAFF_LINK = "https://work.weixin.qq.com/ca/cawcdeaeb65ab3d47f";

const { t } = useI18n();
const { isMiniProgramWebView } = useWeChatMiniProgramWebView();
const staffQrModalOpen = ref(false);
const supportQrModalOpen = ref(false);

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

const usesMiniProgramQrEntry = computed(() => isMiniProgramWebView.value);

const linkActionProps = (href: string) => ({
  href,
  target: "_blank",
  rel: "noopener noreferrer",
});

const buttonActionProps = {
  type: "button" as const,
};

const staffActionTag = computed(() =>
  usesMiniProgramQrEntry.value ? "button" : "a",
);
const supportActionTag = computed(() =>
  usesMiniProgramQrEntry.value ? "button" : "a",
);

const staffActionProps = computed(() =>
  usesMiniProgramQrEntry.value ? buttonActionProps : linkActionProps(staffLink.value),
);

const supportActionProps = computed(() =>
  usesMiniProgramQrEntry.value
    ? buttonActionProps
    : linkActionProps(supportLink.value),
);

const handleStaffAction = (event: Event): void => {
  if (!usesMiniProgramQrEntry.value) return;

  event.preventDefault();
  staffQrModalOpen.value = true;
};

const handleSupportAction = (event: Event): void => {
  if (!usesMiniProgramQrEntry.value) return;

  event.preventDefault();
  supportQrModalOpen.value = true;
};
</script>

<style lang="scss" scoped>
.contact-badge {
  @include mx.pu-font(label-medium);
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
  background: var(--sys-color-surface);
}

.contact-card--staff {
  border-color: var(--sys-color-primary);
}

.contact-card--support {
  align-content: space-between;
  border-color: var(--sys-color-secondary);
}

.contact-card--beta-group {
  grid-column: 1 / -1;
  align-content: space-between;
  border-color: var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-low);
}

.contact-badge--staff {
  @include mx.pu-pill-badge(primary);
}

.contact-badge--support {
  @include mx.pu-pill-badge(secondary);
}

.contact-badge--beta-group {
  @include mx.pu-pill-badge(secondary);
  opacity: 0.8;
}

.contact-copy {
  display: grid;
  gap: var(--sys-spacing-xs);

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
  @include mx.pu-pill-action(solid-primary);
  border: 0;

  &:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.contact-action--support {
  @include mx.pu-pill-action(solid-secondary);
}

.contact-action--beta-group {
  @include mx.pu-pill-action(outline-transparent);
}

.support-entry-links {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm) var(--sys-spacing-med);
}

.support-entry-link {
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

  .support-entry-links {
    justify-content: center;
  }

  .contact-action {
    width: 100%;
  }

  .contact-card {
    justify-items: stretch;
  }
}
</style>
