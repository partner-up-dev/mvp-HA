<template>
  <section class="natural-language-entry">
    <button
      class="natural-language-trigger"
      type="button"
      @click="toggleNLForm"
    >
      <span class="entry-display">{{ t("home.naturalLanguageEntry") }}</span>
      <span
        class="entry-icon i-mdi-chevron-down"
        :class="{ expanded: showNLForm }"
      ></span>
    </button>

    <Transition name="nl-form-expand">
      <div v-if="showNLForm" class="nl-form-panel">
        <div class="nl-form-panel-inner">
          <NLPRForm />
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import NLPRForm from "@/components/NLPRForm.vue";

const { t } = useI18n();
const showNLForm = ref(true);

const toggleNLForm = () => {
  showNLForm.value = !showNLForm.value;
};
</script>

<style lang="scss" scoped>
.natural-language-entry {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.natural-language-trigger {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--sys-color-on-surface);
  text-align: left;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
}

.entry-display {
  @include mx.pu-font(display-large);
  font-size: clamp(1.7rem, 8vw, var(--sys-typo-display-large-size));
  line-height: clamp(2rem, 9vw, var(--sys-typo-display-large-line-height));
  color: var(--sys-color-on-surface);
  display: block;
  letter-spacing: -0.03em;
}

.entry-icon {
  @include mx.pu-icon(medium);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;
  transition: transform 220ms ease;
}

.entry-icon.expanded {
  transform: rotate(180deg);
}

.nl-form-panel {
  overflow: hidden;
  border-top: 1px solid var(--sys-color-outline-variant);
}

.nl-form-panel-inner {
  padding: var(--sys-spacing-med) 0 0;
}

.nl-form-expand-enter-active,
.nl-form-expand-leave-active {
  transition:
    max-height 280ms ease,
    opacity 220ms ease,
    transform 220ms ease;
  overflow: hidden;
}

.nl-form-expand-enter-from,
.nl-form-expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.nl-form-expand-enter-to,
.nl-form-expand-leave-from {
  max-height: 1000px;
  opacity: 1;
  transform: translateY(0);
}

.panel-title {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  margin: 0 0 var(--sys-spacing-sm);
}

.natural-language-trigger:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}
</style>
