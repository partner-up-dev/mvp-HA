<template>
  <Modal
    :open="open"
    :title="t('contactSupportPage.betaGroupModalTitle')"
    max-width="420px"
    @close="emit('close')"
  >
    <div class="beta-group-modal-body">
      <p class="beta-group-modal-description">
        {{ t("contactSupportPage.betaGroupModalDescription") }}
      </p>
      <img
        v-if="betaGroupQrCodeUrl"
        :src="betaGroupQrCodeUrl"
        :alt="t('contactSupportPage.betaGroupQrAlt')"
        class="beta-group-qr-image"
      />
      <p v-else class="beta-group-qr-empty">
        {{ t("contactSupportPage.betaGroupQrMissing") }}
      </p>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { useWeChatBetaGroupQrCode } from "@/shared/wechat/useWeChatBetaGroupQrCode";

interface Props {
  open: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();
const { t } = useI18n();
const { betaGroupQrCodeUrl } = useWeChatBetaGroupQrCode();

useBodyScrollLock(computed(() => props.open));
</script>

<style lang="scss" scoped>
.beta-group-modal-body {
  display: grid;
  justify-items: center;
  gap: var(--sys-spacing-sm);
}

.beta-group-modal-description {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.beta-group-qr-image {
  width: min(100%, 260px);
  border-radius: var(--sys-radius-md);
}

.beta-group-qr-empty {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
