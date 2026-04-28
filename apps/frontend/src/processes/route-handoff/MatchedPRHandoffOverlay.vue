<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="matched-pr-handoff"
      :class="[
        `matched-pr-handoff--${handoff.state.phase.toLowerCase()}`,
      ]"
      aria-live="polite"
    >
      <LiquidWaveSplash
        class="matched-pr-handoff__splash"
        :duration-ms="MATCHED_SPLASH_DRAIN_MS"
        :phase="handoff.state.phase === 'SETTLING' ? 'DRAIN' : 'HOLD'"
        @drain-complete="handleSplashDrained"
      />

      <div class="matched-pr-handoff__stage">
        <div class="matched-pr-handoff__card-shell" :style="cardShellStyle">
          <PRFactsCard
            v-if="handoff.state.prId !== null"
            class="matched-pr-handoff__card"
            :pr-id="handoff.state.prId"
            :interactive="false"
          />

          <div
            v-if="handoff.state.phase === 'PREVIEW'"
            class="matched-pr-handoff__actions"
          >
            <Button
              type="button"
              tone="surface"
              block
              @click="handleCancel"
            >
              {{ t("common.cancel") }}
            </Button>
            <Button
              type="button"
              block
              @click="handleConfirm"
            >
              {{ t("prPage.join") }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";
import PRFactsCard from "@/domains/pr/ui/composites/PRFactsCard.vue";
import { prDetailPath } from "@/domains/pr/routing/routes";
import { trackEvent } from "@/shared/telemetry/track";
import LiquidWaveSplash from "@/processes/route-handoff/LiquidWaveSplash.vue";
import { useMatchedPRHandoff } from "@/processes/route-handoff/useMatchedPRHandoff";

const handoff = useMatchedPRHandoff();
const router = useRouter();
const { t } = useI18n();
const MATCHED_SPLASH_DRAIN_MS = 980;

let alignTimeoutId: number | null = null;
let settleTimeoutId: number | null = null;

const isVisible = computed(
  () => handoff.state.phase !== "IDLE" && handoff.state.prId !== null,
);

const cardShellStyle = computed(() => {
  const targetRect = handoff.state.targetRect;
  if (
    targetRect &&
    (handoff.state.phase === "ALIGNING" ||
      handoff.state.phase === "SETTLING")
  ) {
    return {
      left: `${targetRect.left}px`,
      top: `${targetRect.top}px`,
      width: `${targetRect.width}px`,
      transform: "none",
    };
  }

  return {
    left: "50%",
    top: "50%",
    width: "min(calc(100vw - 2rem), 430px)",
    transform: "translate(-50%, -50%)",
  };
});

const clearTimers = () => {
  if (typeof window === "undefined") {
    alignTimeoutId = null;
    settleTimeoutId = null;
    return;
  }
  if (alignTimeoutId !== null) {
    window.clearTimeout(alignTimeoutId);
    alignTimeoutId = null;
  }
  if (settleTimeoutId !== null) {
    window.clearTimeout(settleTimeoutId);
    settleTimeoutId = null;
  }
};

const handleCancel = () => {
  clearTimers();
  handoff.cancel();
};

const handleConfirm = async () => {
  const prId = handoff.state.prId;
  if (prId === null) {
    return;
  }

  trackEvent("anchor_event_form_result_action_click", {
    eventId: handoff.state.eventId ?? 0,
    action: "MATCHED_JOIN",
    prId,
    candidateRank: null,
  });

  handoff.markNavigating();
  const query = new URLSearchParams({
    handoff: "matched_pr",
  });
  if (handoff.state.eventId !== null) {
    query.set("fromEvent", String(handoff.state.eventId));
  }
  await router.push(`${prDetailPath(prId)}?${query.toString()}`);
};

const handleSplashDrained = () => {
  if (handoff.state.phase !== "SETTLING") {
    return;
  }

  clearTimers();
  handoff.finish();
};

watch(
  () => handoff.state.phase,
  (phase) => {
    clearTimers();
    if (phase !== "ALIGNING" || typeof window === "undefined") {
      return;
    }

    alignTimeoutId = window.setTimeout(() => {
      handoff.beginSettling();
      alignTimeoutId = null;
    }, 640);
  },
);

watch(
  () => handoff.state.phase,
  (phase) => {
    if (phase !== "SETTLING" || typeof window === "undefined") {
      return;
    }

    settleTimeoutId = window.setTimeout(() => {
      handleSplashDrained();
      settleTimeoutId = null;
    }, MATCHED_SPLASH_DRAIN_MS + 180);
  },
);

onBeforeUnmount(() => {
  clearTimers();
});
</script>

<style scoped lang="scss">
.matched-pr-handoff {
  position: fixed;
  inset: 0;
  z-index: 1200;
  pointer-events: auto;
}

.matched-pr-handoff__splash {
  position: absolute;
  inset: 0;
}

.matched-pr-handoff__stage {
  position: absolute;
  inset: 0;
}

.matched-pr-handoff__card-shell {
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  max-width: calc(100vw - 2rem);
  transform-origin: center;
  transition:
    left 620ms cubic-bezier(0.18, 0.86, 0.2, 1),
    top 620ms cubic-bezier(0.18, 0.86, 0.2, 1),
    width 620ms cubic-bezier(0.18, 0.86, 0.2, 1),
    transform 620ms cubic-bezier(0.18, 0.86, 0.2, 1),
    opacity 280ms ease;
}

.matched-pr-handoff--preview .matched-pr-handoff__card-shell {
  animation: matched-pr-card-spin-in 760ms cubic-bezier(0.16, 0.9, 0.2, 1)
    both;
}

.matched-pr-handoff--settling .matched-pr-handoff__card-shell {
  opacity: 0;
}

.matched-pr-handoff__card {
  box-shadow: 0 1.25rem 4rem rgba(0, 0, 0, 0.2);
}

.matched-pr-handoff__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

@keyframes matched-pr-card-spin-in {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.18) rotate(-42deg);
  }

  58% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.06) rotate(9deg);
  }

  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .matched-pr-handoff__card-shell {
    transition: none;
  }

  .matched-pr-handoff--preview .matched-pr-handoff__card-shell {
    animation: none;
  }
}
</style>
