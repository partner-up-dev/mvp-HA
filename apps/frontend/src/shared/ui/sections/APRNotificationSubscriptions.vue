<template>
  <article
    v-for="item in items"
    :key="item.key"
    class="subscription-card"
  >
    <div class="subscription-main">
      <p class="subscription-title">{{ item.title }}</p>
      <p class="subscription-desc">{{ item.description }}</p>
    </div>

    <button
      v-if="item.actionKind === 'OPEN_SUBSCRIBE' && item.pending"
      :class="[
        'action-btn',
        props.outlineProfile === 'surface' ? 'action-btn--surface' : 'action-btn--secondary',
      ]"
      type="button"
      disabled
    >
      {{ props.updatingLabel }}
    </button>

    <div
      v-else-if="
        item.actionKind === 'OPEN_SUBSCRIBE' &&
        item.actionLabel &&
        item.openSubscribeTemplateId &&
        !item.actionDisabled
      "
      class="native-action-shell"
    >
      <wx-open-subscribe
        class="open-subscribe-native"
        :template="item.openSubscribeTemplateId"
        @success="handleOpenSubscribeSuccess(item.key, $event)"
        @error="handleOpenSubscribeError(item.key, $event)"
      />
    </div>

    <button
      v-else-if="item.actionLabel"
      :class="[
        'action-btn',
        props.outlineProfile === 'surface' ? 'action-btn--surface' : 'action-btn--secondary',
      ]"
      type="button"
      :disabled="item.actionDisabled || item.pending"
      @click="handleAction(item.key)"
    >
      {{ item.pending ? props.updatingLabel : item.actionLabel }}
    </button>
  </article>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import {
  useWeChatNotificationSubscriptionsPanel,
  type WeChatNotificationKind,
} from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";

const props = withDefaults(
  defineProps<{
    visibleKinds?: readonly WeChatNotificationKind[];
    updatingLabel: string;
    outlineProfile?: "primary" | "surface";
  }>(),
  {
    visibleKinds: () =>
      ["REMINDER_CONFIRMATION", "BOOKING_RESULT", "NEW_PARTNER"] as const,
    outlineProfile: "primary",
  },
);

const emit = defineEmits<{
  "error-change": [error: Error | null];
}>();

const notificationSubscriptions = useWeChatNotificationSubscriptionsPanel({
  visibleKinds: props.visibleKinds,
});

const items = computed(() => notificationSubscriptions.items.value);

const panelError = computed(() => {
  if (notificationSubscriptions.mutation.error.value instanceof Error) {
    return notificationSubscriptions.mutation.error.value;
  }
  if (notificationSubscriptions.query.error.value instanceof Error) {
    return notificationSubscriptions.query.error.value;
  }
  return null;
});

watch(
  panelError,
  (nextError) => {
    emit("error-change", nextError);
  },
  { immediate: true },
);

const extractEventDetail = (event: unknown): unknown => {
  if (event && typeof event === "object" && "detail" in event) {
    return (event as { detail: unknown }).detail;
  }
  return null;
};

const handleAction = async (kind: WeChatNotificationKind) => {
  await notificationSubscriptions.handleAction(kind);
};

const handleOpenSubscribeSuccess = async (
  kind: WeChatNotificationKind,
  event: unknown,
) => {
  await notificationSubscriptions.handleOpenSubscribeSuccess(
    kind,
    extractEventDetail(event),
  );
};

const handleOpenSubscribeError = async (
  kind: WeChatNotificationKind,
  event: unknown,
) => {
  await notificationSubscriptions.handleOpenSubscribeError(
    kind,
    extractEventDetail(event),
  );
};
</script>

<style scoped lang="scss">
.subscription-card {
  @include mx.pu-surface-card(outline);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
}

.subscription-main {
  display: flex;
  flex: 1 1 16rem;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;
}

.subscription-title {
  margin: 0;
  @include mx.pu-font(label-large);
}

.subscription-desc {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.action-btn {
  @include mx.pu-rect-action(primary, default);
  @include mx.pu-font(label-large);
  min-width: 7.5rem;
  border: none;
  cursor: pointer;
}

.action-btn:disabled {
  cursor: not-allowed;
  background: color-mix(in srgb, var(--sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--sys-color-on-surface) 38%, transparent);
  box-shadow: none;
}

.action-btn--secondary {
  @include mx.pu-rect-action(outline-primary, default);
}

.action-btn--surface {
  @include mx.pu-rect-action(outline, default);
}

.action-btn--secondary:disabled,
.action-btn--surface:disabled {
  background: transparent;
  border-color: color-mix(in srgb, var(--sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--sys-color-on-surface) 38%, transparent);
}

.native-action-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0 var(--sys-spacing-sm);
  border-radius: var(--sys-shape-corner-medium);
  background: var(--sys-color-primary-container);
}

.open-subscribe-native {
  display: inline-flex;
}
</style>
