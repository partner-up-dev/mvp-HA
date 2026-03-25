<template>
  <PageScaffoldCentered class="contact-author-page">
    <template #header>
      <PageHeader :title="t('contactAuthorPage.title')" />
    </template>

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

    <section v-else class="author-content">
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
    </section>
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PageScaffoldCentered from "@/shared/ui/layout/PageScaffoldCentered.vue";
import { PUBLIC_CONFIG_KEYS, usePublicConfig } from "@/shared/config/queries/usePublicConfig";

const { t } = useI18n();
const publicConfigQuery = usePublicConfig(PUBLIC_CONFIG_KEYS.authorWechatQrCode);

const qrCodeUrl = computed(() => publicConfigQuery.data.value?.value ?? null);

</script>

<style lang="scss" scoped>
.author-content {
  display: flex;
  flex-direction: column;
  align-items: center;
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
