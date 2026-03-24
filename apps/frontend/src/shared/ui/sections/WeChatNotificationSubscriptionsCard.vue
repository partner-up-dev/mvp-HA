<template>
  <section class="section-card">
    <h2 class="section-title">{{ title }}</h2>
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
        {{ updatingLabel }}
      </button>

      <wx-open-subscribe
        v-else-if="
          item.actionKind === 'OPEN_SUBSCRIBE' &&
          item.actionLabel &&
          item.openSubscribeTemplateId &&
          !item.actionDisabled
        "
        class="open-subscribe"
        :template="item.openSubscribeTemplateId"
        @success="handleOpenSubscribeSuccess(item.key, $event)"
        @error="handleOpenSubscribeError(item.key, $event)"
      ></wx-open-subscribe>

      <button
        v-else-if="item.actionLabel"
        :class="[
          'action-btn',
          props.outlineProfile === 'surface' ? 'action-btn--surface' : 'action-btn--secondary',
        ]"
        type="button"
        :disabled="item.actionDisabled || item.pending"
        @click="emit('action', item.key)"
      >
        {{ item.pending ? updatingLabel : item.actionLabel }}
      </button>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { NotificationSubscriptionCardItem } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";

const props = withDefaults(
  defineProps<{
    title: string;
    items: NotificationSubscriptionCardItem[];
    updatingLabel: string;
    outlineProfile?: "primary" | "surface";
  }>(),
  {
    outlineProfile: "primary",
  },
);

const emit = defineEmits<{
  action: [kind: NotificationSubscriptionCardItem["key"]];
  "open-subscribe-success": [
    kind: NotificationSubscriptionCardItem["key"],
    detail: unknown,
  ];
  "open-subscribe-error": [
    kind: NotificationSubscriptionCardItem["key"],
    detail: unknown,
  ];
}>();

const extractEventDetail = (event: unknown): unknown => {
  if (event && typeof event === "object" && "detail" in event) {
    return (event as { detail: unknown }).detail;
  }
  return null;
};

const handleOpenSubscribeSuccess = (
  kind: NotificationSubscriptionCardItem["key"],
  event: unknown,
) => {
  emit("open-subscribe-success", kind, extractEventDetail(event));
};

const handleOpenSubscribeError = (
  kind: NotificationSubscriptionCardItem["key"],
  event: unknown,
) => {
  emit("open-subscribe-error", kind, extractEventDetail(event));
};
</script>

<style scoped lang="scss">
.section-card {
  @include mx.pu-surface-card(section);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.section-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.subscription-card {
  @include mx.pu-surface-card(outline);
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
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

.open-subscribe {
  display: inline-flex;
  min-height: 2.5rem;
}

@media (max-width: 768px) {
  .subscription-card .action-btn,
  .subscription-card .open-subscribe {
    width: 100%;
  }
}
</style>
