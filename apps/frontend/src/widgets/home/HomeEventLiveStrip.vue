<template>
  <div class="live-strip">
    <p class="live-pill live-pill--primary">
      <span class="i-mdi:fire-circle" aria-hidden="true"></span>
      {{ joinedLabel }}
    </p>
    <p class="live-pill">
      <span class="i-mdi:account-group" aria-hidden="true"></span>
      {{ sessionLabel }}
    </p>
    <p class="live-pill">
      <span class="i-mdi:clock-fast" aria-hidden="true"></span>
      {{ timingLabel }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

interface HomeEventLiveStripProps {
  joinedCount: number;
  activeSessionCount: number;
  startsSoonCount: number;
  nextStartLabel: string | null;
}

const props = defineProps<HomeEventLiveStripProps>();
const { t } = useI18n();

const joinedLabel = computed(() =>
  t("home.landing.eventUnitCopy.liveJoinedTotal", {
    count: props.joinedCount,
  }),
);

const sessionLabel = computed(() =>
  t("home.landing.eventUnitCopy.liveSessionTotal", {
    count: props.activeSessionCount,
  }),
);

const timingLabel = computed(() => {
  if (props.startsSoonCount > 0) {
    return t("home.landing.eventUnitCopy.liveStartsSoon", {
      count: props.startsSoonCount,
    });
  }

  if (props.nextStartLabel) {
    return t("home.landing.eventUnitCopy.liveNextStart", {
      time: props.nextStartLabel,
    });
  }

  return t("home.landing.eventUnitCopy.fallbackUpdating");
});
</script>

<style lang="scss" scoped>
.live-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.live-pill {
  @include mx.pu-font(label-medium);
  margin: 0;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.34rem 0.6rem;
  border-radius: 999px;
  border: 1px solid
    color-mix(in srgb, var(--sys-color-outline) 76%, transparent);
  background: var(--sys-color-surface-container-low);
  color: var(--sys-color-on-surface);

  span {
    @include mx.pu-icon(small);
  }
}

.live-pill--primary {
  border-color: color-mix(in srgb, var(--sys-color-primary) 46%, transparent);
  background: color-mix(in srgb, var(--sys-color-primary) 13%, transparent);
  color: color-mix(
    in srgb,
    var(--sys-color-primary) 78%,
    var(--sys-color-on-surface)
  );
}
</style>
