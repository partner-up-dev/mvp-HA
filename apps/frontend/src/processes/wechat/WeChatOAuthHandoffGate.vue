<template>
  <slot v-if="ready" />

  <main v-else class="wechat-oauth-handoff" aria-live="polite">
    <section class="wechat-oauth-handoff__content" aria-busy="true">
      <div
        v-if="state !== 'failed'"
        class="wechat-oauth-handoff__spinner"
        aria-hidden="true"
      ></div>
      <div v-else class="wechat-oauth-handoff__mark" aria-hidden="true">!</div>

      <p class="wechat-oauth-handoff__eyebrow">微信登录</p>
      <h1 class="wechat-oauth-handoff__title">{{ title }}</h1>
      <p class="wechat-oauth-handoff__description">{{ description }}</p>

      <div v-if="state !== 'loading'" class="wechat-oauth-handoff__actions">
        <Button
          v-if="state === 'failed'"
          type="button"
          tone="primary"
          @click="retry"
        >
          重新尝试
        </Button>
        <Button type="button" tone="surface" @click="continueAsGuest">
          先以访客浏览
        </Button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/shared/ui/actions/Button.vue";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import {
  clearWeChatOAuthHandoffFromAddressBar,
  consumeWeChatOAuthHandoff,
  hasPendingWeChatOAuthHandoff,
  WECHAT_OAUTH_HANDOFF_QUERY_PARAM,
} from "@/processes/wechat/oauth-handoff";

const HANDOFF_SLOW_THRESHOLD_MS = 8_000;

type HandoffGateState = "loading" | "slow" | "failed";

const ready = ref(!hasPendingWeChatOAuthHandoff());
const state = ref<HandoffGateState>("loading");
const route = useRoute();
const router = useRouter();

let attemptId = 0;
let slowTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;

const title = computed(() => {
  if (state.value === "slow") return "微信登录还在确认";
  if (state.value === "failed") return "微信登录没有完成";
  return "正在完成微信登录";
});

const description = computed(() => {
  if (state.value === "slow") {
    return "当前连接比平常久，可以继续等待，或先以访客状态浏览。";
  }
  if (state.value === "failed") {
    return "可能是登录凭证过期或网络中断，请重新尝试。";
  }
  return "请稍候，不需要刷新页面。";
});

const clearSlowTimer = (): void => {
  if (!slowTimer) return;
  clearTimeout(slowTimer);
  slowTimer = null;
};

const stopPendingRequest = (): void => {
  clearSlowTimer();
  abortController?.abort();
  abortController = null;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const completeHandoff = (): void => {
  ready.value = true;
  void ensureAuthSessionBootstrapped();
};

const clearHandoffRoute = async (): Promise<void> => {
  clearWeChatOAuthHandoffFromAddressBar();

  if (!(WECHAT_OAUTH_HANDOFF_QUERY_PARAM in route.query)) {
    return;
  }

  const query = { ...route.query };
  delete query[WECHAT_OAUTH_HANDOFF_QUERY_PARAM];

  await router
    .replace({
      path: route.path,
      query,
      hash: route.hash,
    })
    .catch(() => undefined);
};

const runHandoff = async (): Promise<void> => {
  const currentAttemptId = attemptId + 1;
  attemptId = currentAttemptId;

  if (!hasPendingWeChatOAuthHandoff()) {
    completeHandoff();
    return;
  }

  stopPendingRequest();
  state.value = "loading";

  const controller = new AbortController();
  abortController = controller;
  slowTimer = setTimeout(() => {
    if (attemptId === currentAttemptId && !ready.value) {
      state.value = "slow";
    }
  }, HANDOFF_SLOW_THRESHOLD_MS);

  try {
    const consumed = await consumeWeChatOAuthHandoff({
      signal: controller.signal,
    });
    if (attemptId !== currentAttemptId) return;

    clearSlowTimer();
    abortController = null;

    if (consumed) {
      await clearHandoffRoute();
      completeHandoff();
      return;
    }

    state.value = "failed";
  } catch (error) {
    if (attemptId !== currentAttemptId) return;

    clearSlowTimer();
    abortController = null;

    if (isAbortError(error)) {
      return;
    }

    state.value = "failed";
  }
};

const retry = (): void => {
  void runHandoff();
};

const continueAsGuest = async (): Promise<void> => {
  attemptId += 1;
  stopPendingRequest();
  await clearHandoffRoute();
  completeHandoff();
};

onMounted(() => {
  if (!ready.value) {
    void runHandoff();
  }
});

onBeforeUnmount(() => {
  attemptId += 1;
  stopPendingRequest();
});
</script>

<style lang="scss" scoped>
@use "@/styles/mixins" as mx;

.wechat-oauth-handoff {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--pu-vh);
  padding: var(--sys-spacing-lg) var(--sys-spacing-med);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.wechat-oauth-handoff__content {
  display: flex;
  width: min(100%, calc(var(--sys-size-xLarge) * 6));
  flex-direction: column;
  align-items: center;
  gap: var(--sys-spacing-sm);
  text-align: center;
}

.wechat-oauth-handoff__spinner,
.wechat-oauth-handoff__mark {
  width: var(--sys-size-large);
  height: var(--sys-size-large);
  margin-bottom: var(--sys-spacing-sm);
  border-radius: 50%;
}

.wechat-oauth-handoff__spinner {
  border: 3px solid var(--sys-color-outline-variant);
  border-top-color: var(--sys-color-primary);
  animation: wechat-oauth-handoff-spin 0.8s linear infinite;
}

.wechat-oauth-handoff__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sys-color-error-container);
  color: var(--sys-color-on-error-container);

  @include mx.pu-font(title-medium);
}

.wechat-oauth-handoff__eyebrow {
  color: var(--sys-color-primary);

  @include mx.pu-font(label-medium);
}

.wechat-oauth-handoff__title {
  max-width: 100%;
  color: var(--sys-color-on-surface);

  @include mx.pu-font(title-large);
}

.wechat-oauth-handoff__description {
  max-width: 100%;
  color: var(--sys-color-on-surface-variant);

  @include mx.pu-font(body-medium);
}

.wechat-oauth-handoff__actions {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-med);
}

@media (prefers-reduced-motion: reduce) {
  .wechat-oauth-handoff__spinner {
    animation: none;
  }
}

@keyframes wechat-oauth-handoff-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
