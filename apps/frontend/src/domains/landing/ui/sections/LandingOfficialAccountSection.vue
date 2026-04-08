<template>
  <section class="official-account-section" data-block="official-account">
    <Button
      appearance="rect"
      tone="outline"
      size="md"
      full-width
      @click="showOfficialAccountQrModal = true"
    >
      {{ t("home.landing.officialAccountAction") }}
    </Button>

    <p class="official-account-section__hint">
      {{ t("home.landing.officialAccountDescription") }}
    </p>
  </section>

  <OfficialAccountQrModal
    :open="showOfficialAccountQrModal"
    @close="showOfficialAccountQrModal = false"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import OfficialAccountQrModal from "@/shared/wechat/OfficialAccountQrModal.vue";

const { t } = useI18n();
const showOfficialAccountQrModal = ref(false);
</script>

<style lang="scss" scoped>
.official-account-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-sm);
  padding-top: var(--sys-spacing-md);
  border-top: 1px dashed
    color-mix(in srgb, var(--sys-color-outline) 44%, transparent);
}

.official-account-section__hint {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
  max-width: 32ch;
}

@media (max-width: 768px) {
  .official-account-section__hint {
    @include mx.pu-font(body-large);
    max-width: none;
  }
}
</style>
