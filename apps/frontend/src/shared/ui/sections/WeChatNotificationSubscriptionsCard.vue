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
        v-if="item.actionLabel"
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
}>();
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

@media (max-width: 768px) {
  .subscription-card .action-btn {
    width: 100%;
  }
}
</style>
