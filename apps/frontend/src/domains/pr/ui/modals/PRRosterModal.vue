<template>
  <Modal
    :open="open"
    :title="t('prPage.partnerSection.rosterBoardTitle')"
    max-width="560px"
    @close="emit('close')"
  >
    <div class="roster-modal">
      <p class="roster-modal__meta">
        {{
          t("prPage.partnerSection.rosterCount", {
            count: section.roster.length,
          })
        }}
      </p>

      <AnchorPRAwarenessLane :pr-id="prId" :section="section" />

      <Button tone="surface" block @click="emit('close')">
        {{ t("common.close") }}
      </Button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Modal from "@/shared/ui/overlay/Modal.vue";
import Button from "@/shared/ui/actions/Button.vue";
import AnchorPRAwarenessLane from "@/domains/pr/ui/sections/AnchorPRAwarenessLane.vue";
import type { AnchorPRDetailView } from "@/domains/pr/model/types";

type PartnerSection = AnchorPRDetailView["partnerSection"];

defineProps<{
  open: boolean;
  prId: number;
  section: PartnerSection;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
</script>

<style scoped lang="scss">
.roster-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.roster-modal__meta {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}
</style>
