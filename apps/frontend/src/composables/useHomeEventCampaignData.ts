import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAnchorEventDetail } from "@/queries/useAnchorEventDetail";
import { useAnchorEvents } from "@/queries/useAnchorEvents";
import {
  HOME_EVENT_CAMPAIGN_CONFIG,
  HOME_EVENT_CAMPAIGN_KEYS,
  matchHomeEventCampaigns,
  type HomeEventCampaignKey,
} from "@/widgets/home/event-campaigns";

type TimeWindow = [string | null, string | null];

export interface HomeEventCampaignViewModel {
  eventId: number | null;
  locations: string[];
  nextStartAtLabel: string | null;
  isLoading: boolean;
  hasEvent: boolean;
}

export type HomeEventCampaignViewMap = Record<
  HomeEventCampaignKey,
  HomeEventCampaignViewModel
>;

const formatNearestStartAt = (
  timeWindows: TimeWindow[],
  locale: string,
): string | null => {
  const nearest = timeWindows
    .map(([start]) => start)
    .filter((start): start is string => typeof start === "string")
    .map((rawStart) => {
      const date = new Date(rawStart);
      return Number.isNaN(date.getTime()) ? null : { rawStart, date };
    })
    .filter(
      (
        value,
      ): value is {
        rawStart: string;
        date: Date;
      } => value !== null,
    )
    .sort((left, right) => left.date.getTime() - right.date.getTime())[0];

  if (!nearest) {
    return null;
  }

  const hasTime = nearest.rawStart.includes("T");
  const weekdayLabel = nearest.date.toLocaleDateString(locale, {
    weekday: "short",
  });

  if (!hasTime) {
    return weekdayLabel;
  }

  const timeLabel = nearest.date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${weekdayLabel} ${timeLabel}`;
};

const getLocationLabels = (
  labels: Array<string | null | undefined>,
  fallbackLocation: string,
): string[] => {
  const uniqueLabels = Array.from(
    new Set(
      labels
        .map((label) => (typeof label === "string" ? label.trim() : ""))
        .filter((label) => label.length > 0),
    ),
  );

  if (uniqueLabels.length > 0) {
    return uniqueLabels;
  }

  return [fallbackLocation];
};

export const useHomeEventCampaignData = () => {
  const { locale } = useI18n();
  const { data: events, isLoading: isEventsLoading } = useAnchorEvents();

  const matchedCampaignEvents = computed(() =>
    matchHomeEventCampaigns(events.value ?? []),
  );

  const badmintonEventId = computed(
    () => matchedCampaignEvents.value.badminton?.id ?? null,
  );
  const runningEventId = computed(
    () => matchedCampaignEvents.value.running?.id ?? null,
  );
  const teaTalkEventId = computed(
    () => matchedCampaignEvents.value.teaTalk?.id ?? null,
  );
  const speakingEventId = computed(
    () => matchedCampaignEvents.value.speaking?.id ?? null,
  );

  const badmintonDetail = useAnchorEventDetail(badmintonEventId);
  const runningDetail = useAnchorEventDetail(runningEventId);
  const teaTalkDetail = useAnchorEventDetail(teaTalkEventId);
  const speakingDetail = useAnchorEventDetail(speakingEventId);

  const campaigns = computed<HomeEventCampaignViewMap>(() => {
    const buildCampaignView = (
      key: HomeEventCampaignKey,
      eventId: number | null,
      detail: ReturnType<typeof useAnchorEventDetail>,
    ): HomeEventCampaignViewModel => {
      const fallbackLocation = HOME_EVENT_CAMPAIGN_CONFIG[key].fallbackLocation;
      const locations = getLocationLabels(
        detail.data.value?.locationPool ?? [],
        fallbackLocation,
      );
      const nextStartAtLabel = formatNearestStartAt(
        (detail.data.value?.batches ?? []).map((batch) => batch.timeWindow),
        locale.value,
      );

      return {
        eventId,
        locations,
        nextStartAtLabel,
        hasEvent: eventId !== null,
        isLoading: Boolean(isEventsLoading.value) || Boolean(detail.isLoading.value),
      };
    };

    return {
      badminton: buildCampaignView(
        "badminton",
        badmintonEventId.value,
        badmintonDetail,
      ),
      running: buildCampaignView("running", runningEventId.value, runningDetail),
      teaTalk: buildCampaignView("teaTalk", teaTalkEventId.value, teaTalkDetail),
      speaking: buildCampaignView(
        "speaking",
        speakingEventId.value,
        speakingDetail,
      ),
    };
  });

  const hasAtLeastOneMappedEvent = computed(() => {
    return HOME_EVENT_CAMPAIGN_KEYS.some(
      (key) => campaigns.value[key].eventId !== null,
    );
  });

  return {
    campaigns,
    hasAtLeastOneMappedEvent,
  };
};
