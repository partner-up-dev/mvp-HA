import type { AnchorEventDemandCardsResponse } from "@/domains/event/model/types";
import {
  addDaysToProductLocalDateKey,
  getTodayProductLocalDateKey,
  isProductLocalDateKey,
  parseProductLocalDateKey,
  type ProductLocalDateKey,
} from "@/shared/datetime/productLocalDate";

type TimeWindow = [string | null, string | null];

export type DemandCardViewModel = {
  cardKey: string;
  timeWindow: TimeWindow;
  batchStartTimestamp: number;
  timeLabel: string;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  candidateCount: number;
  coverImage: string | null;
};

type PoiGalleryResolver = (location: string | null) => string | null;

const PRODUCT_TIME_ZONE = "Asia/Shanghai";

const productLocalTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const productLocalWeekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  weekday: "short",
});

const resolveRelativeDayLabel = (
  dateKey: ProductLocalDateKey,
): "今天" | "明天" | "后天" | null => {
  const todayDateKey = getTodayProductLocalDateKey();
  if (dateKey === todayDateKey) {
    return "今天";
  }

  const tomorrowDateKey = addDaysToProductLocalDateKey(todayDateKey, 1);
  if (tomorrowDateKey !== null && dateKey === tomorrowDateKey) {
    return "明天";
  }

  const dayAfterTomorrowDateKey = addDaysToProductLocalDateKey(
    todayDateKey,
    2,
  );
  if (
    dayAfterTomorrowDateKey !== null &&
    dateKey === dayAfterTomorrowDateKey
  ) {
    return "后天";
  }

  return null;
};

const resolveTimeWindowStartDateKey = (
  timeWindow: TimeWindow,
): ProductLocalDateKey | null => {
  const [start] = timeWindow;
  const normalized = start?.trim() ?? "";
  if (!normalized) {
    return null;
  }

  if (isProductLocalDateKey(normalized)) {
    return normalized;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return getTodayProductLocalDateKey(date);
};

const formatDemandCardShortDateLabel = (
  dateKey: ProductLocalDateKey,
): string => {
  const parsed = parseProductLocalDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }

  return `${parsed.getUTCMonth() + 1}.${parsed.getUTCDate()}`;
};

const formatDemandCardDateLabel = (dateKey: ProductLocalDateKey): string => {
  const shortDateLabel = formatDemandCardShortDateLabel(dateKey);
  const relativeDayLabel = resolveRelativeDayLabel(dateKey);
  if (relativeDayLabel !== null) {
    return `${relativeDayLabel}(${shortDateLabel})`;
  }

  const parsed = parseProductLocalDateKey(dateKey);
  if (!parsed) {
    return shortDateLabel;
  }

  return `${shortDateLabel}${productLocalWeekdayFormatter.format(parsed)}`;
};

const formatTimeWindowStartTime = (timeWindow: TimeWindow): string | null => {
  const [start] = timeWindow;
  const normalized = start?.trim() ?? "";
  if (!normalized || isProductLocalDateKey(normalized)) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return productLocalTimeFormatter.format(date);
};

const formatCardTimeLabel = (timeWindow: TimeWindow): string => {
  const dateKey = resolveTimeWindowStartDateKey(timeWindow);
  const dateLabel = dateKey ? formatDemandCardDateLabel(dateKey) : null;
  const timeLabel = formatTimeWindowStartTime(timeWindow);

  if (dateLabel && timeLabel) {
    return `${dateLabel} ${timeLabel}`;
  }

  return dateLabel ?? timeLabel ?? "";
};

export const toDemandCardViewModels = ({
  cards,
  eventCoverImage,
  resolveCoverImage,
}: {
  cards: AnchorEventDemandCardsResponse;
  eventCoverImage: string | null;
  resolveCoverImage: PoiGalleryResolver;
}): DemandCardViewModel[] =>
  cards.map((card) => ({
    cardKey: card.cardKey,
    timeWindow: card.timeWindow,
    batchStartTimestamp: card.batchStartTimestamp,
    timeLabel: formatCardTimeLabel(card.timeWindow),
    displayLocationName: card.displayLocationName,
    preferenceFingerprint: card.preferenceFingerprint,
    preferenceTags: card.preferenceTags,
    notes: card.notes,
    detailPrId: card.detailPrId,
    candidateCount: card.candidateCount,
    coverImage:
      resolveCoverImage(card.displayLocationName) ?? eventCoverImage ?? null,
  }));
