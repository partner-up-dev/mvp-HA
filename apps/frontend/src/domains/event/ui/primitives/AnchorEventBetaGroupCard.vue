<template>
  <ExpandableCard
    v-if="variant === 'list'"
    class="anchor-event-beta-group-card anchor-event-beta-group-card--list"
    :title="cardTitle"
    :subtitle="description"
    :default-expanded="defaultExpanded"
    data-region="event-beta-group"
  >
    <div class="anchor-event-beta-group-card__body">
      <img
        v-if="normalizedQrCodeUrl"
        :src="normalizedQrCodeUrl"
        :alt="qrAlt"
        class="anchor-event-beta-group-card__qr"
      />
      <p v-else class="anchor-event-beta-group-card__missing">
        {{ t("anchorEvent.betaGroupCard.qrMissing") }}
      </p>
    </div>
  </ExpandableCard>

  <article
    v-else
    class="anchor-event-beta-group-card anchor-event-beta-group-card--card"
    data-region="event-beta-group"
  >
    <div class="anchor-event-beta-group-card__summary">
      <span class="anchor-event-beta-group-card__kicker">
        {{ cardTitle }}
      </span>
      <span class="anchor-event-beta-group-card__description">
        {{ description }}
      </span>
    </div>

    <div class="anchor-event-beta-group-card__body">
      <img
        v-if="normalizedQrCodeUrl"
        :src="normalizedQrCodeUrl"
        :alt="qrAlt"
        class="anchor-event-beta-group-card__qr"
      />
      <p v-else class="anchor-event-beta-group-card__missing">
        {{ t("anchorEvent.betaGroupCard.qrMissing") }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import ExpandableCard from "@/shared/ui/containers/ExpandableCard.vue";

const props = withDefaults(
  defineProps<{
    eventId?: number | string;
    eventTitle: string;
    qrCodeUrl?: string | null;
    defaultExpanded?: boolean;
    variant?: "list" | "card";
  }>(),
  {
    eventId: undefined,
    qrCodeUrl: null,
    defaultExpanded: false,
    variant: "list",
  },
);

const { t } = useI18n();

const normalizeHttpUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const qrAlt = computed(() =>
  t("anchorEvent.betaGroupCard.qrAlt", { eventTitle: props.eventTitle }),
);
const normalizedQrCodeUrl = computed(() => normalizeHttpUrl(props.qrCodeUrl));
const cardTitle = computed(() => {
  const title = props.eventTitle.trim();
  return title.length > 0
    ? `${title}群`
    : t("anchorEvent.betaGroupCard.kicker");
});
const description = computed(() => t("anchorEvent.betaGroupCard.description"));
</script>

<style lang="scss" scoped>
.anchor-event-beta-group-card--card {
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.anchor-event-beta-group-card__summary {
  display: grid;
  gap: var(--sys-spacing-xsmall);
}

.anchor-event-beta-group-card__kicker {
  @include mx.pu-font(title-medium);
  color: var(--sys-color-on-surface);
}

.anchor-event-beta-group-card__description {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.anchor-event-beta-group-card__body {
  display: grid;
  justify-items: center;
}

.anchor-event-beta-group-card__qr {
  width: min(100%, 220px);
  border-radius: var(--sys-radius-medium);
}

.anchor-event-beta-group-card__missing {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
