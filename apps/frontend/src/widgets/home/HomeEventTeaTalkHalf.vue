<template>
  <article class="event-half event-half--tea-talk">
    <div class="event-copy">
      <p class="event-kicker">
        {{ t("home.landing.eventCampaigns.teaTalk.kicker") }}
      </p>
      <h3>{{ t("home.landing.eventCampaigns.teaTalk.title") }}</h3>
      <p>{{ t("home.landing.eventCampaigns.teaTalk.description") }}</p>

      <RouterLink class="event-cta" :to="destination" @click="handleClick">
        {{
          t("home.landing.eventCampaigns.teaTalk.ctaWithLocation", {
            location: locationText,
          })
        }}
        <span
          class="event-cta-icon i-mdi:arrow-right"
          aria-hidden="true"
        ></span>
      </RouterLink>
    </div>

    <div class="event-visual" aria-hidden="true">
      <div class="event-visual-frame">
        <span class="event-visual-icon i-mdi:tea"></span>
        <span class="event-visual-label">
          {{ t("home.landing.eventCampaigns.teaTalk.imagePlaceholder") }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useRotatingTextWithTypeWriter } from "@/composables/useRotatingTextWithTypeWriter";
import { trackEvent } from "@/shared/analytics/track";
import type { HomeEventCampaignViewModel } from "@/composables/useHomeEventCampaignData";

const TEA_TALK_INDEX = 2;

interface HomeEventTeaTalkHalfProps {
  campaign: HomeEventCampaignViewModel;
}

const props = defineProps<HomeEventTeaTalkHalfProps>();
const { t } = useI18n();

const { displayText: rotatingLocation } = useRotatingTextWithTypeWriter(
  computed(() => props.campaign.locations),
  {
    mode: "typewriter",
    holdMs: 1280,
    typeStepMs: 78,
    eraseStepMs: 44,
  },
);

const locationText = computed(() => {
  const dynamicText = rotatingLocation.value.trim();
  if (dynamicText.length > 0) {
    return dynamicText;
  }

  return (
    props.campaign.locations[0] ??
    t("home.landing.eventCampaigns.teaTalk.fallbackLocation")
  );
});

const destination = computed(() => {
  if (props.campaign.eventId !== null) {
    return {
      name: "anchor-event" as const,
      params: {
        eventId: props.campaign.eventId,
      },
    };
  }

  return {
    name: "event-plaza" as const,
  };
});

const handleClick = () => {
  if (props.campaign.eventId === null) {
    return;
  }

  trackEvent("home_event_highlight_click", {
    eventId: props.campaign.eventId,
    index: TEA_TALK_INDEX,
  });
};
</script>

<style lang="scss" scoped>
.event-half {
  --event-accent: var(--sys-color-tertiary);
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(7.4rem, 26vw, 9.6rem);
  gap: var(--sys-spacing-med);
  align-items: stretch;
  padding: clamp(0.9rem, 3vw, 1.2rem) 0;
}

.event-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h3 {
    @include mx.pu-font(title-large);
    margin: 0;
    color: var(--sys-color-on-surface);
    text-wrap: balance;
  }

  p {
    @include mx.pu-font(body-medium);
    margin: 0;
    color: var(--sys-color-on-surface-variant);
    max-width: 24ch;
  }
}

.event-kicker {
  @include mx.pu-font(label-medium);
  margin: 0;
  color: color-mix(
    in srgb,
    var(--event-accent) 72%,
    var(--sys-color-on-surface)
  );
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.event-cta {
  @include mx.pu-font(label-large);
  margin-top: var(--sys-spacing-sm);
  width: fit-content;
  text-decoration: none;
  color: var(--sys-color-on-surface);
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xs);
  padding: 0.28rem 0.08rem 0.24rem;
  border-bottom: 1px solid
    color-mix(in srgb, var(--event-accent) 44%, var(--sys-color-outline));
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    color 180ms ease;

  &:hover {
    transform: translateX(3px);
    border-color: color-mix(
      in srgb,
      var(--event-accent) 64%,
      var(--sys-color-outline)
    );
    color: color-mix(
      in srgb,
      var(--sys-color-on-surface) 88%,
      var(--event-accent)
    );
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.event-cta-icon {
  @include mx.pu-icon(small);
}

.event-visual {
  min-height: 0;
  display: flex;
}

.event-visual-frame {
  width: 100%;
  min-height: clamp(6.2rem, 18vw, 7.4rem);
  border-radius: var(--sys-radius-sm);
  border: 1px dashed
    color-mix(in srgb, var(--event-accent) 38%, var(--sys-color-outline));
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--event-accent) 11%, transparent),
      color-mix(
        in srgb,
        var(--sys-color-surface-container-low) 72%,
        transparent
      )
    ),
    var(--sys-color-surface-container-low);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.event-visual-icon {
  @include mx.pu-icon(large);
  color: color-mix(
    in srgb,
    var(--event-accent) 62%,
    var(--sys-color-on-surface)
  );
}

.event-visual-label {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
  text-wrap: balance;
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .event-half {
    grid-template-columns: 1fr;
    gap: var(--sys-spacing-sm);
  }

  .event-copy h3 {
    @include mx.pu-font(title-medium);
  }

  .event-copy p {
    @include mx.pu-font(body-small);
  }

  .event-cta {
    @include mx.pu-font(label-medium);
    margin-top: var(--sys-spacing-xs);
  }

  .event-visual-frame {
    min-height: clamp(5.6rem, 22vw, 6.4rem);
  }
}
</style>
