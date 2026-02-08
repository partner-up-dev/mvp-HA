<template>
  <button
    class="structured-entry"
    type="button"
    :aria-label="`${t('home.structuredEntryPrefix')} ${rotatingTopic}`"
    @click="goToStructuredCreate"
  >
    <span class="structured-content entry-display">
      <span>{{ t("home.structuredEntryPrefix") }}</span>
      <span class="topic-display">
        <span
          v-for="(char, index) in rotatingTopicChars"
          :key="`${topicAnimationCycle}-${index}-${char}`"
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
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const router = useRouter();
const { t } = useI18n();
const rotatingTopics = [
  t("home.topics.movie"),
  t("home.topics.sports"),
  t("home.topics.explore"),
  t("home.topics.hiking"),
  t("home.topics.study"),
];
const topicIndex = ref(0);
const rotatingTopic = ref(rotatingTopics[topicIndex.value]);
const visibleTopicLength = ref(Array.from(rotatingTopic.value).length);
const isErasing = ref(false);
const topicAnimationCycle = ref(0);
const rotatingTopicChars = computed(() =>
  Array.from(rotatingTopic.value).slice(0, visibleTopicLength.value),
);
const pendingTimers: Array<{ id: number; resolve: () => void }> = [];
let stopTopicAnimation = false;

const TOPIC_HOLD_MS = 1300;
const ERASE_STEP_MS = 90;
const ENTER_STAGGER_MS = 55;
const ENTER_BASE_MS = 350;

const wait = async (delayMs: number) => {
  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      const timeoutIndex = pendingTimers.findIndex(
        (timer) => timer.id === timeoutId,
      );
      if (timeoutIndex >= 0) {
        pendingTimers.splice(timeoutIndex, 1);
      }
      resolve();
    }, delayMs);
    pendingTimers.push({ id: timeoutId, resolve });
  });
};

const runTopicAnimation = async () => {
  while (!stopTopicAnimation) {
    await wait(TOPIC_HOLD_MS);
    if (stopTopicAnimation) {
      break;
    }

    isErasing.value = true;
    const currentLength = Array.from(rotatingTopic.value).length;
    for (
      let length = currentLength - 1;
      length >= 0 && !stopTopicAnimation;
      length -= 1
    ) {
      visibleTopicLength.value = length;
      await wait(ERASE_STEP_MS);
    }

    if (stopTopicAnimation) {
      break;
    }

    isErasing.value = false;
    topicIndex.value = (topicIndex.value + 1) % rotatingTopics.length;
    rotatingTopic.value = rotatingTopics[topicIndex.value];
    visibleTopicLength.value = Array.from(rotatingTopic.value).length;
    topicAnimationCycle.value += 1;

    const enterDuration =
      ENTER_BASE_MS + visibleTopicLength.value * ENTER_STAGGER_MS;
    await wait(Math.max(TOPIC_HOLD_MS, enterDuration));
  }
};

onMounted(() => {
  void runTopicAnimation();
});

onUnmounted(() => {
  stopTopicAnimation = true;
  for (const pendingTimer of pendingTimers) {
    window.clearTimeout(pendingTimer.id);
    pendingTimer.resolve();
  }
  pendingTimers.length = 0;
});

const goToStructuredCreate = async () => {
  await router.push({
    path: "/pr/new",
    query: {
      topic: rotatingTopic.value,
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
  align-items: flex-end;
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
