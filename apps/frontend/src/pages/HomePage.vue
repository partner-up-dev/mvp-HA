<template>
  <div class="home-page">
    <header class="header">
      <h1>{{ t("home.title") }}</h1>
      <p>{{ t("home.subtitle") }}</p>
    </header>

    <main class="main">
      <section class="entry-panel">
        <button class="entry-row" type="button" @click="goToStructuredCreate">
          <span class="entry-text"
            >{{ t("home.structuredEntryPrefix") }} {{ rotatingTopic }}</span
          >
          <span class="entry-icon i-mdi-chevron-right"></span>
        </button>

        <button class="entry-row" type="button" @click="toggleNLForm">
          <span class="entry-text">{{ t("home.naturalLanguageEntry") }}</span>
          <span
            class="entry-icon"
            :class="showNLForm ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down'"
          ></span>
        </button>
      </section>

      <section v-if="showNLForm" class="nl-form-panel">
        <p class="panel-title">{{ t("home.naturalLanguagePanelTitle") }}</p>
        <NLPRForm />
      </section>

      <CreatedPRList empty-mode="hide" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import CreatedPRList from "@/components/CreatedPRList.vue";
import NLPRForm from "@/components/NLPRForm.vue";

const router = useRouter();
const { t } = useI18n();
const showNLForm = ref(true);
const rotatingTopics = [
  t("home.topics.movie"),
  t("home.topics.sports"),
  t("home.topics.explore"),
  t("home.topics.hiking"),
  t("home.topics.study"),
];
const topicIndex = ref(0);
const rotatingTopic = ref(rotatingTopics[topicIndex.value]);
let timer: number | null = null;

onMounted(() => {
  timer = window.setInterval(() => {
    topicIndex.value = (topicIndex.value + 1) % rotatingTopics.length;
    rotatingTopic.value = rotatingTopics[topicIndex.value];
  }, 2500);
});

onUnmounted(() => {
  if (timer !== null) {
    window.clearInterval(timer);
  }
});

const goToStructuredCreate = async () => {
  await router.push("/pr/new");
};

const toggleNLForm = () => {
  showNLForm.value = !showNLForm.value;
};
</script>

<style lang="scss" scoped>
.home-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}

.header {
  padding: var(--sys-spacing-lg) 0;

  h1 {
    @include mx.pu-font(headline-large);
    color: var(--sys-color-primary);
    margin: 0;
  }
  p {
    @include mx.pu-font(body-large);
    color: var(--sys-color-on-surface-variant);
  }
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.entry-panel {
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  overflow: hidden;
  background: var(--sys-color-surface-container);
}

.entry-row {
  @include mx.pu-font(title-medium);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-med);
  border: none;
  background: transparent;
  color: var(--sys-color-on-surface);
  text-align: left;
  cursor: pointer;

  &:not(:last-child) {
    border-bottom: 1px solid var(--sys-color-outline-variant);
  }
}

.entry-icon {
  font-size: 1.25rem;
  color: var(--sys-color-on-surface-variant);
}

.nl-form-panel {
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  padding: var(--sys-spacing-med);
  background: var(--sys-color-surface);
}

.panel-title {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  margin: 0 0 var(--sys-spacing-sm);
}
</style>
