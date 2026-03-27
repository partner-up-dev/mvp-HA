<template>
  <article
    v-for="item in items"
    :key="item.key"
    class="subscription-card"
  >
    <div class="subscription-head">
      <p class="subscription-title">{{ item.title }}</p>
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
        class="open-subscribe-proxy"
      >
        <button
          :class="[
            'action-btn',
            props.outlineProfile === 'surface' ? 'action-btn--surface' : 'action-btn--secondary',
          ]"
          type="button"
        >
          {{ item.actionLabel }}
        </button>

        <wx-open-subscribe
          class="open-subscribe-overlay"
          :template="item.openSubscribeTemplateId"
          @success="handleOpenSubscribeSuccess(item.key, $event)"
          @error="handleOpenSubscribeError(item.key, $event)"
        >
          <component
            :is="'script'"
            type="text/wxtag-template"
            slot="style"
            v-html="openSubscribeStyleTemplate"
          />
          <component
            :is="'script'"
            type="text/wxtag-template"
            v-html="openSubscribeButtonTemplate"
          />
        </wx-open-subscribe>
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
    </div>

    <p class="subscription-desc">{{ item.description }}</p>
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

// Safe constant template for WeChat open tag; never interpolate user input.
const openSubscribeStyleTemplate = `
<style>
.open-subscribe-hit-target {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}
</style>
`;

const openSubscribeButtonTemplate = `
<button class="open-subscribe-hit-target"></button>
`;
</script>

<style scoped lang="scss">
.subscription-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-2xs);
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.subscription-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-xs);
}

.subscription-title {
  margin: 0;
  @include mx.pu-font(label-medium);
}

.subscription-desc {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.action-btn {
  @include mx.pu-font(label-medium);
  min-height: 2rem;
  padding: 0 var(--sys-spacing-sm);
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.action-btn:disabled {
  cursor: not-allowed;
  background: color-mix(in srgb, var(--sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--sys-color-on-surface) 38%, transparent);
  box-shadow: none;
}

.action-btn--secondary {
  @include mx.pu-rect-action(outline-primary, compact);
}

.action-btn--surface {
  @include mx.pu-rect-action(outline, compact);
}

.action-btn--secondary:disabled,
.action-btn--surface:disabled {
  background: transparent;
  border-color: color-mix(in srgb, var(--sys-color-on-surface) 12%, transparent);
  color: color-mix(in srgb, var(--sys-color-on-surface) 38%, transparent);
}

.open-subscribe-proxy {
  position: relative;
  display: inline-flex;
  min-height: 2rem;
}

.open-subscribe-proxy .action-btn {
  pointer-events: none;
}

.open-subscribe-overlay {
  position: absolute;
  inset: 0;
  display: inline-flex;
  width: 100%;
  height: 100%;
  min-height: 2rem;
}

@media (max-width: 768px) {
  .subscription-head {
    gap: var(--sys-spacing-2xs);
  }

  .subscription-head .action-btn,
  .subscription-head .open-subscribe-proxy {
    flex-shrink: 0;
  }
}
</style>
