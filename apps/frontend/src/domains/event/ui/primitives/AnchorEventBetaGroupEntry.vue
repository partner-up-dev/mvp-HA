<template>
  <div class="beta-group-entry">
    <p class="beta-group-entry__hint">
      <button
        type="button"
        class="beta-group-entry__action"
        @click="showBetaGroupModal = true"
      >
        {{ t("anchorEvent.betaGroupAction") }}
      </button>
      <span>{{ t("anchorEvent.betaGroupHintSuffix") }}</span>
    </p>

    <BetaGroupQrModal
      :open="showBetaGroupModal"
      @close="showBetaGroupModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import BetaGroupQrModal from "@/shared/wechat/BetaGroupQrModal.vue";

const { t } = useI18n();
const showBetaGroupModal = ref(false);
</script>

<style lang="scss" scoped>
.beta-group-entry {
  display: flex;
}

.beta-group-entry__hint {
  margin: 0;
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  display: inline;
}

.beta-group-entry__action {
  appearance: none;
  padding: 0;
  border: none;
  background: transparent;
  @include mx.pu-font(label-large);
  color: var(--sys-color-secondary);
  text-decoration: underline;
  text-underline-offset: 0.12em;
  font-family: inherit;
  line-height: inherit;
  cursor: pointer;

  &:hover {
    color: var(--sys-color-primary);
    opacity: 0.82;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
}
</style>
