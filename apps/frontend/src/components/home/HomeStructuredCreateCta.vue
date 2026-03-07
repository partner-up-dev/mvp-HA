<template>
  <button
    class="structured-entry"
    type="button"
    :aria-label="`${t('home.structuredEntryPrefix')} ${activeTopicName}`"
    @click="goToStructuredCreate"
  >
    <span class="structured-content entry-display">
      <span>{{ t("home.structuredEntryPrefix") }}</span>
      <span class="topic-display">
        <span
          v-for="(char, index) in rotatingTopicChars"
          :key="`${animationCycle}-${index}-${char}`"
          class="topic-char"
          :style="{ '--char-index': String(index) }"
        >
          {{ char }}
        </span>
        <span
          class="type-caret"
          :class="{ erasing: isErasing }"
          aria-hidden="true"
        ></span>
      </span>
    </span>
    <span class="entry-icon i-mdi-chevron-right"></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useHomeRotatingTopic } from "@/composables/useHomeRotatingTopic";
import { useRotatingTextWithTypeWriter } from "@/composables/useRotatingTextWithTypeWriter";
import { communityPRCreatePath } from "@/entities/pr/routes";

const router = useRouter();
const { t } = useI18n();
const { rotatingTopics } = useHomeRotatingTopic();

const TOPIC_HOLD_MS = 1300;
const ERASE_STEP_MS = 90;
const TYPE_STEP_MS = 88;

const topicNames = computed(() => rotatingTopics.map((topic) => topic.name));
const {
  displayText: rotatingTopicName,
  currentValue: activeTopicName,
  isErasing,
  animationCycle,
} = useRotatingTextWithTypeWriter(topicNames, {
  mode: "typewriter",
  holdMs: TOPIC_HOLD_MS,
  typeStepMs: TYPE_STEP_MS,
  eraseStepMs: ERASE_STEP_MS,
});

const rotatingTopicChars = computed(() => Array.from(rotatingTopicName.value));

const goToStructuredCreate = async () => {
  const topicForQuery = activeTopicName.value || topicNames.value[0] || "";

  await router.push({
    path: communityPRCreatePath(),
    query: {
      topic: topicForQuery,
    },
  });
};
</script>

<style lang="scss" scoped>
.structured-entry {
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

.structured-content {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.topic-display {
  display: flex;
  align-items: center;
  min-height: clamp(2rem, 9vw, var(--sys-typo-display-large-line-height));
  flex-wrap: wrap;
}

.topic-char {
  display: inline-block;
  opacity: 0;
  transform: translate3d(0, 0.5rem, 0) scale(0.96);
  animation: char-enter 420ms cubic-bezier(0.2, 0.75, 0.2, 1) forwards;
  animation-delay: calc(var(--char-index) * 55ms);
}

.type-caret {
  width: 2px;
  height: 0.9em;
  margin-left: 0.1em;
  background: var(--sys-color-primary);
  animation: caret-blink 0.95s step-end infinite;
}

.type-caret.erasing {
  animation: none;
}

.entry-icon {
  @include mx.pu-icon(medium);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;
}

.structured-entry:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

@keyframes char-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 0.5rem, 0) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes caret-blink {
  0%,
  45% {
    opacity: 1;
  }
  46%,
  100% {
    opacity: 0;
  }
}
</style>

