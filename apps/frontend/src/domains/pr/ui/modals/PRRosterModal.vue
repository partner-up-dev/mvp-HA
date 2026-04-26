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

      <PRAwarenessLane :pr-id="prId" :section="section" />

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
import PRAwarenessLane from "@/domains/pr/ui/sections/PRAwarenessLane.vue";
import type { PRPartnerSectionView } from "@/domains/pr/model/types";

type PartnerSection = PRPartnerSectionView;

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
  gap: var(--sys-spacing-medium);
}

.roster-modal__meta {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}
</style>
