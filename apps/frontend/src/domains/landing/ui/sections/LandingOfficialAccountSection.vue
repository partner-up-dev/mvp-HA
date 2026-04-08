<template>
  <section class="official-account-section" data-block="official-account">
    <div class="official-account-section__copy">
      <p class="official-account-section__eyebrow">
        {{ t("home.landing.officialAccountEyebrow") }}
      </p>
      <h3>{{ t("home.landing.officialAccountTitle") }}</h3>
      <p>{{ t("home.landing.officialAccountDescription") }}</p>
    </div>

    <Button
      appearance="pill"
      tone="surface"
      size="md"
      @click="showOfficialAccountQrModal = true"
    >
      {{ t("home.landing.officialAccountAction") }}
    </Button>
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
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-md);
  padding-top: var(--sys-spacing-md);
  border-top: 1px dashed
    color-mix(in srgb, var(--sys-color-outline) 44%, transparent);
}

.official-account-section__copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxs);
  min-width: 0;

  h3 {
    @include mx.pu-font(title-large);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
    max-width: 30ch;
  }
}

.official-account-section__eyebrow {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-primary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

@media (max-width: 768px) {
  .official-account-section {
    flex-direction: column;
    align-items: stretch;
  }

  .official-account-section__copy h3 {
    @include mx.pu-font(title-medium);
  }

  .official-account-section__copy p {
    @include mx.pu-font(body-large);
    max-width: none;
  }
}
</style>
